import { getPublicApiBase } from '@/lib/api/publicApiBase';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options;

  let url = `${getPublicApiBase()}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          searchParams.set(key, String(value));
        }
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    credentials: 'include',
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errObj = json.error as Record<string, unknown> | undefined;
    throw new ApiError(
      res.status,
      (typeof errObj?.message === 'string' ? errObj.message : null) ??
        (json as { message?: string }).message ??
        `HTTP ${res.status}`,
      typeof errObj?.code === 'string' ? errObj.code : undefined,
      errObj ?? json,
    );
  }

  return json as T;
}

export const apiClient = {
  get: <T>(endpoint: string, params?: FetchOptions['params']) =>
    request<T>(endpoint, { method: 'GET', params }),
  postMultipart: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const url = `${getPublicApiBase()}${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(
        res.status,
        json.error?.message ?? `HTTP ${res.status}`,
        json.error?.code,
        json.error?.details,
      );
    }
    return json as T;
  },
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
