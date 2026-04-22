import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { MediaType } from '@prisma/client';
import { MAX_FILE_BYTES } from '@/services/media-service';

function mediaStatus(m: { isApproved: boolean; isRejected: boolean }) {
  if (m.isRejected) return 'rejected' as const;
  if (m.isApproved) return 'approved' as const;
  return 'pending' as const;
}

function serializeMedia(m: {
  id: string;
  userId: string;
  type: MediaType;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  isApproved: boolean;
  isRejected: boolean;
  moderationNote: string | null;
  createdAt: Date;
}) {
  return {
    id: m.id,
    userId: m.userId,
    type: m.type,
    url: m.url || null,
    filename: m.filename,
    mimeType: m.mimeType,
    size: m.size,
    status: mediaStatus(m),
    moderationNote: m.moderationNote,
    createdAt: m.createdAt.toISOString(),
  };
}

export const mediaRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: { fileSize: MAX_FILE_BYTES },
  });

  const auth = [fastify.authenticate];

  fastify.post('/upload', { preHandler: auth }, async (request, reply) => {
    let buffer: Buffer | null = null;
    let mimeType = '';
    let uploadTypeRaw: string | undefined;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        buffer = await part.toBuffer();
        mimeType = part.mimetype;
      } else if (part.type === 'field' && part.fieldname === 'type') {
        uploadTypeRaw = String(part.value);
      }
    }

    if (!buffer?.length) {
      return reply.status(400).send({ error: { code: 'NO_FILE', message: 'Файл не передан' } });
    }

    const typeParse = z.nativeEnum(MediaType).safeParse(uploadTypeRaw);
    if (!typeParse.success) {
      return reply.status(400).send({ error: { code: 'INVALID_TYPE', message: 'Некорректный type' } });
    }

    try {
      const media = await fastify.mediaService.upload({
        userId: request.jwtUser.sub,
        activeRole: request.jwtUser.activeRole,
        buffer,
        mimeType,
        type: typeParse.data,
      });
      return reply.status(201).send({ data: serializeMedia(media) });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      const msg = e instanceof Error ? e.message : 'Ошибка загрузки';
      if (code === 400) {
        return reply.status(400).send({ error: { code: 'VALIDATION', message: msg } });
      }
      if (code === 403) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: msg } });
      }
      throw e;
    }
  });

  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: auth }, async (request, reply) => {
    try {
      await fastify.mediaService.delete(request.params.id, request.jwtUser.sub);
      return reply.send({ data: { success: true } });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Не найдено' } });
      }
      throw e;
    }
  });

  fastify.get('/my', { preHandler: auth }, async (request, reply) => {
    const list = await fastify.mediaService.getForUser(request.jwtUser.sub);
    const serialized = list.map(serializeMedia);

    const pickFirst = (t: MediaType) => serialized.find((x) => x.type === t) ?? null;
    const pickAll = (t: MediaType) => serialized.filter((x) => x.type === t);

    const role = request.jwtUser.activeRole;
    if (role === 'employer') {
      return reply.send({
        data: {
          logo: pickFirst('COMPANY_LOGO'),
          banner: pickFirst('COMPANY_BANNER'),
          gallery: pickAll('COMPANY_GALLERY'),
          avatar: null,
          portfolio: [],
          documents: [],
          videos: null,
        },
      });
    }

    return reply.send({
      data: {
        avatar: pickFirst('AVATAR'),
        portfolio: pickAll('PORTFOLIO_PHOTO'),
        documents: pickAll('DOCUMENT'),
        videos: pickFirst('VIDEO_CARD'),
        logo: null,
        banner: null,
        gallery: [],
      },
    });
  });
};
