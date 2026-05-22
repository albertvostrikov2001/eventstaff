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
import { replyFail, replyOk } from '@/lib/api-reply';
import { safeUserSelect } from '@/lib/safe-user-select';

const REVIEW_WINDOW_MS = 72 * 60 * 60 * 1000;

export const shiftActionRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = [fastify.authenticate];

  function rel(): ReliabilityService {
    return new ReliabilityService(fastify.prisma, fastify.notificationService);
  }

  fastify.post(
    '/shifts/escalation/run',
    { preHandler: [fastify.authenticate, fastify.requireRole(['admin'])] },
    async (_request, reply) => {
      const n = await processStaleShiftConfirmations(fastify.prisma, fastify.notificationService);
      return replyOk(reply, { processed: n });
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
      return replyOk(reply, shift);
    } catch (e) {
      if (e instanceof ShiftConfirmationError) {
        return replyFail(reply, e.statusCode, String(e.code), e.messageRu);
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
      return replyFail(reply, 404, 'NOT_FOUND', 'Смена не найдена');
    }
    if (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.CANCELLED) {
      return replyFail(reply, 400, 'INVALID', 'Смена уже закрыта');
    }
    const isEmp = shift.employerId === uid;
    const isWork = shift.workerId === uid;
    const isAdmin = request.jwtUser.roles?.includes('admin');
    if (body.failedBy === 'WORKER' && !isEmp && !isAdmin) {
      return replyFail(reply, 403, 'FORBIDDEN', 'Только работодатель');
    }
    if (body.failedBy === 'EMPLOYER' && !isWork && !isAdmin) {
      return replyFail(reply, 403, 'FORBIDDEN', 'Только работник');
    }
    if (body.failedBy === 'BOTH' && !isAdmin) {
      return replyFail(reply, 403, 'FORBIDDEN', 'Только администратор');
    }
    const allowCodes =
      body.failedBy === 'WORKER' ? WORKER_FAILURE_CODES : EMPLOYER_FAILURE_CODES;
    if (!([...allowCodes] as string[]).includes(body.reason)) {
      return replyFail(reply, 400, 'INVALID', 'Некорректная причина');
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
    return replyOk(reply, failed);
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
            worker: { include: { user: { select: safeUserSelect } } },
            employer: { include: { user: { select: safeUserSelect } } },
          },
        },
      },
    });
    if (!shift) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Смена не найдена');
    }
    if (shift.status !== ShiftStatus.COMPLETED) {
      return replyFail(reply, 400, 'INVALID', 'Смена не завершена');
    }
    if (!shift.completedAt) {
      return replyFail(reply, 400, 'INVALID', 'Нет даты завершения');
    }
    if (Date.now() - shift.completedAt.getTime() > REVIEW_WINDOW_MS) {
      return replyFail(reply, 400, 'REVIEW_WINDOW', 'Срок оценки (72ч) истёк');
    }
    if (shift.workerId !== uid && shift.employerId !== uid) {
      return replyFail(reply, 403, 'FORBIDDEN', 'Нет доступа');
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
      return replyFail(reply, 409, 'DUPLICATE', 'Оценка уже оставлена');
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
    return replyOk(reply, review, 201);
  });
};
