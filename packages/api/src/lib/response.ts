/**
 * Standardized API response helpers.
 *
 * Success:  { success: true, data: T }
 * List:     { success: true, data: T[], meta: { total, page, perPage, totalPages } }
 * Error:    { success: false, error: { code, message, details? } }
 */

import type { FastifyReply } from 'fastify';
import { normalizeMediaFieldsDeep } from '@/lib/media-url';

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export function ok<T>(reply: FastifyReply, data: T) {
  return reply.send({ success: true, data: normalizeMediaFieldsDeep(data) });
}

export function paginated<T>(reply: FastifyReply, data: T[], meta: PaginationMeta) {
  return reply.send({ success: true, data: normalizeMediaFieldsDeep(data), meta });
}

export function fail(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return reply.status(status).send({
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  });
}

/** Parse pagination query params with safe defaults. */
export function parsePagination(
  query: Record<string, unknown>,
  maxPerPage = 50,
): { page: number; perPage: number; skip: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(maxPerPage, Math.max(1, Number(query.perPage) || 20));
  return { page, perPage, skip: (page - 1) * perPage };
}
