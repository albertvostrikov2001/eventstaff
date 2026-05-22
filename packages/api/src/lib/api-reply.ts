import type { FastifyReply } from 'fastify';
import { normalizeMediaFieldsDeep } from '@/lib/media-url';

/** Успех: `{ success: true, data: T }` */
export function replyOk(reply: FastifyReply, data: unknown, statusCode = 200) {
  return reply.status(statusCode).send({ success: true, data: normalizeMediaFieldsDeep(data) });
}

/** Список с пагинацией: `{ success: true, data, meta }` */
export function replyPaginated(reply: FastifyReply, data: unknown, meta: Record<string, unknown>, statusCode = 200) {
  return reply.status(statusCode).send({ success: true, data: normalizeMediaFieldsDeep(data), meta });
}

/** Ошибка: `{ success: false, error: { code, message, details? } }` */
export function replyFail(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const error: Record<string, unknown> = { code, message };
  if (details !== undefined) error.details = details;
  return reply.status(statusCode).send({ success: false, error });
}
