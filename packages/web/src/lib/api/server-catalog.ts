import { config } from '@/lib/config';

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export type CatalogWorkerMeta = {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string | null;
  city?: { name: string } | null;
};

export type CatalogEmployerMeta = {
  id: string;
  slug: string;
  companyName: string | null;
  description?: string | null;
  city?: { name: string } | null;
};

export type CatalogVacancyMeta = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  city?: { name: string } | null;
  employer?: { companyName: string | null; contactName?: string | null };
};

export function fetchWorkerForMetadata(id: string) {
  return fetchJson<CatalogWorkerMeta>(`/catalog/workers/${id}`);
}

export function fetchEmployerForMetadata(slug: string) {
  return fetchJson<CatalogEmployerMeta>(`/catalog/employers/${slug}`);
}

export function fetchVacancyForMetadata(id: string) {
  return fetchJson<CatalogVacancyMeta>(`/catalog/vacancies/${id}`);
}
