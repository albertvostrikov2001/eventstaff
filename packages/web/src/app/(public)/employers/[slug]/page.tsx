import type { Metadata } from 'next';
import { config } from '@/lib/config';
import { fetchEmployerForMetadata } from '@/lib/api/server-catalog';
import { EmployerDetailPageClient } from './EmployerDetailPageClient';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const employer = await fetchEmployerForMetadata(params.slug);
  if (!employer?.companyName) {
    return { title: 'Работодатель не найден' };
  }
  const title = employer.companyName;
  const description =
    employer.description?.slice(0, 160) ||
    `${title} — работодатель на платформе event-персонала Юнити.`;
  const canonical = `${config.siteUrl}/employers/${params.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Юнити`,
      description,
      url: canonical,
      type: 'website',
    },
  };
}

export default function EmployerDetailPage() {
  return <EmployerDetailPageClient />;
}
