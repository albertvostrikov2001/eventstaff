import { EditVacancyPageClient } from './EditVacancyPageClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function EditVacancyPage() {
  return <EditVacancyPageClient />;
}
