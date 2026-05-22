import type { Metadata } from 'next';
import { config } from '@/lib/config';
import { fetchWorkerForMetadata } from '@/lib/api/server-catalog';
import { WorkerDetailPageClient } from './WorkerDetailPageClient';
import { PAGE_DYNAMIC, buildStaticParams } from '@/lib/static-export-routes';

export const dynamic = PAGE_DYNAMIC;

export function generateStaticParams() {
  return buildStaticParams([{ id: 'placeholder' }]);
}

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const worker = await fetchWorkerForMetadata(params.id);
  if (!worker) {
    return { title: 'Специалист не найден' };
  }
  const name = `${worker.firstName} ${worker.lastName}`.trim() || 'Специалист';
  const city = worker.city?.name;
  const title = city ? `${name} — ${city}` : name;
  const description =
    worker.bio?.slice(0, 160) ||
    `Профиль специалиста event-индустрии ${name} на платформе Юнити.`;
  const canonical = `${config.siteUrl}/workers/${params.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Юнити`,
      description,
      url: canonical,
      type: 'profile',
    },
  };
}

export default function WorkerDetailPage() {
  return <WorkerDetailPageClient />;
}
