import type { Metadata } from 'next';
import { config } from '@/lib/config';
import { fetchVacancyForMetadata } from '@/lib/api/server-catalog';
import { VacancyPublicDetailPageClient } from './VacancyPublicDetailPageClient';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const vacancy = await fetchVacancyForMetadata(params.id);
  if (!vacancy || vacancy.status !== 'active') {
    return { title: 'Вакансия не найдена' };
  }
  const employerName =
    vacancy.employer?.companyName?.trim() ||
    vacancy.employer?.contactName?.trim() ||
    'Работодатель';
  const city = vacancy.city?.name;
  const title = city ? `${vacancy.title} — ${city}` : vacancy.title;
  const description =
    vacancy.description?.slice(0, 160) ||
    `Вакансия «${vacancy.title}» от ${employerName} на платформе Юнити.`;
  const canonical = `${config.siteUrl}/vacancies/${params.id}`;

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

export default function VacancyPublicDetailPage() {
  return <VacancyPublicDetailPageClient />;
}
