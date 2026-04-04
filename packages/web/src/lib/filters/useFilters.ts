'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useMemo, useCallback } from 'react';
import type { ZodSchema } from 'zod';

function parseMultiValueParams(searchParams: URLSearchParams): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const keys = new Set(searchParams.keys());
  for (const key of keys) {
    const values = searchParams.getAll(key);
    result[key] = values.length === 1 ? values[0] : values;
  }
  return result;
}

function serializeToParams<T extends Record<string, unknown>>(
  filters: T,
  params: URLSearchParams,
): void {
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)));
    } else if (typeof value === 'boolean') {
      params.set(key, String(value));
    } else {
      params.set(key, String(value));
    }
  }
}

export function useFilters<T extends Record<string, unknown>>(
  schema: ZodSchema<T>,
  defaults: Partial<T>,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => {
    const parsed = parseMultiValueParams(searchParams);
    try {
      return schema.parse({ ...defaults, ...parsed });
    } catch {
      return schema.parse(defaults);
    }
  }, [searchParams, schema, defaults]);

  const setFilters = useCallback(
    (newFilters: Partial<T>) => {
      const params = new URLSearchParams();
      const merged = { ...filters, ...newFilters };
      serializeToParams(merged, params);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, setFilters, resetFilters };
}
