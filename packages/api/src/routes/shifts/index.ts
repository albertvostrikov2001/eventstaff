import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ShiftFailedBy, ShiftStatus } from '@prisma/client';
import { ReliabilityService } from '@/services/reliability-service';
import {
  WORKER_FAILURE_CODES,
  EMPLOYER_FAILURE_CODES,
} from '@/lib/shift-codes';
import { publicSiteUrl } from '@/lib/public-site-url';
import { processStaleShiftConfirmations } from '@/lib/shift-escalation';
import {
  ShiftConfirmationError,
  confirmShiftParticipation,
} from '@/lib/shift-confirmation';

const REVIEW_WINDOW_MS = 72 * 60 * 60 * 1000;

export const shiftActionRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = [fastify.authenticate];

  function rel(): ReliabilityService {
    return new ReliabilityService(fastify.prisma, fastify.notificationService);
  }

  fastify.post(
    '/shifts/escalation/run',
    { preHandler: [fastify.authenticate, fastify.requireRole(['admin'])] },
    async () => {
      const n = await processStaleShiftConfirmations(fastify.prisma, fastify.notificationService);
      return { data: { processed: n } };
    },
  );

  // POST /shifts/:id/confirm
  fastify.post<{ Params: { id: string } }>('/shifts/:id/confirm', { preHandler: auth }, async (request, reply) => {
    const { id } = request.params;
    const uid = request.jwtUser.sub;
    try {
      const shift = await confirmShiftParticipation(
        { prisma: fastify.prisma, notificationService: fastify.notificationService },
        id,
        uid,
      );
      return reply.send({ data: shift });
    } catch (e) {
      if (e instanceof ShiftConfirmationError) {
        return reply.status(e.statusCode).send({ error: { code: e.code, message: e.messageRu } });
      }
      throw e;
    }
  });

  // POST /shifts/:id/fail
  fastify.post<{ Params: { id: string } }>('/shifts/:id/fail', { preHandler: auth }, async (request, reply) => {
    const body = z
      .object({
        failedBy: z.nativeEnum(ShiftFailedBy),
        reason: z.string().min(1).max(64),
        note: z.string().max(2000).optional(),
      })
      .parse(request.body);
    const { id } = request.params;
    const uid = request.jwtUser.sub;
    const shift = await fastify.prisma.shift.findUnique({ where: { id } });
    if (!shift) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Смена не найдена' } });
    }
    if (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.CANCELLED) {
      return reply.status(400).send({ error: { code: 'INVALID', message: 'Смена уже закрыта' } });
    }
    const isEmp = shift.employerId === uid;
    const isWork = shift.workerId === uid;
    const isAdmin = request.jwtUser.roles?.includes('admin');
    if (body.failedBy === 'WORKER' && !isEmp && !isAdmin) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Только работодатель' } });
    }
    if (body.failedBy === 'EMPLOYER' && !isWork && !isAdmin) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Только работник' } });
    }
    if (body.failedBy === 'BOTH' && !isAdmin) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Только администратор' } });
    }
    const allowCodes =
      body.failedBy === 'WORKER' ? WORKER_FAILURE_CODES : EMPLOYER_FAILURE_CODES;
    if (!([...allowCodes] as string[]).includes(body.reason)) {
      return reply.status(400).send({ error: { code: 'INVALID', message: 'Некорректная причина' } });
    }
    const failed = await fastify.prisma.shift.update({
      where: { id },
      data: {
        status: ShiftStatus.FAILED,
        failedBy: body.failedBy,
        failureCode: body.reason,
        failureNote: body.note,
        failureReason: body.reason,
      },
    });
    const svc = rel();
    await svc.recalculate(shift.workerId);
    await svc.recalculate(shift.employerId);
    return reply.send({ data: failed });
  });

  // POST /shifts/:id/review
  fastify.post<{ Params: { id: string } }>('/shifts/:id/review', { preHandler: auth }, async (request, reply) => {
    const { id } = request.params;
    const body = z
      .object({
        punctuality: z.number().int().min(1).max(5),
        jobMatch: z.number().int().min(1).max(5),
        communication: z.number().int().min(1).max(5),
        workQuality: z.number().int().min(1).max(5),
        termsCompliance: z.number().int().min(1).max(5),
        comment: z.string().max(4000).optional(),
      })
      .parse(request.body);
    const uid = request.jwtUser.sub;
    const shift = await fastify.prisma.shift.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            linkedVacancy: true,
            worker: { include: { user: true } },
            employer: { include: { user: true } },
          },
        },
      },
    });
    if (!shift) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Смена не найдена' } });
    }
    if (shift.status !== ShiftStatus.COMPLETED) {
      return reply.status(400).send({ error: { code: 'INVALID', message: 'Смена не завершена' } });
    }
    if (!shift.completedAt) {
      return reply.status(400).send({ error: { code: 'INVALID', message: 'Нет даты завершения' } });
    }
    if (Date.now() - shift.completedAt.getTime() > REVIEW_WINDOW_MS) {
      return reply
        .status(400)
        .send({ error: { code: 'REVIEW_WINDOW', message: 'Срок оценки (72ч) истёк' } });
    }
    if (shift.workerId !== uid && shift.employerId !== uid) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Нет доступа' } });
    }
    const revieweeId = uid === shift.workerId ? shift.employerId : shift.workerId;
    const dim =
      body.punctuality +
      body.jobMatch +
      body.communication +
      body.workQuality +
      body.termsCompliance;
    const overallScore = dim / 5;
    let review;
    try {
      review = await fastify.prisma.shiftReview.create({
        data: {
          shiftId: shift.id,
          reviewerId: uid,
          revieweeId,
          punctuality: body.punctuality,
          jobMatch: body.jobMatch,
          communication: body.communication,
          workQuality: body.workQuality,
          termsCompliance: body.termsCompliance,
          overallScore,
          comment: body.comment,
        },
      });
    } catch {
      return reply.status(409).send({ error: { code: 'DUPLICATE', message: 'Оценка уже оставлена' } });
    }
    const reviewerName =
      uid === shift.workerId
        ? `${shift.booking.worker.firstName} ${shift.booking.worker.lastName}`.trim()
        : shift.booking.employer.companyName || shift.booking.employer.contactName || 'Работодатель';
    const revieweeUser = await fastify.prisma.user.findUnique({
      where: { id: revieweeId },
      select: { email: true, employerProfile: { select: { id: true } } },
    });
    const site = publicSiteUrl();
    const vacancyTitle =
      shift.booking.linkedVacancy?.title || shift.booking.description?.slice(0, 80) || 'Смена';
    const cta = revieweeUser?.employerProfile
      ? `${site}/employer/dashboard`
      : `${site}/worker/dashboard`;
    await fastify.notificationService.create({
      userId: revieweeId,
      type: 'REVIEW_RECEIVED',
      title: 'Новая оценка по смене',
      body: `${reviewerName} оценил(а) вас: ${overallScore.toFixed(1)}`,
      data: { shiftReviewId: review.id, shiftId: shift.id },
    });
    if (revieweeUser?.email) {
      await fastify.emailService.queue({
        userId: revieweeId,
        to: revieweeUser.email,
        type: 'REVIEW_RECEIVED',
        templateData: {
          reviewerName,
          overallScore: overallScore.toFixed(1),
          comment: body.comment ?? '',
          ctaUrl: cta,
          vacancyTitle,
        },
      });
    }
    return reply.status(201).send({ data: review });
  });
};
