import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вакансии для event-персонала',
  description:
    'Найдите работу официантом, барменом, хостес и другими специалистами на мероприятиях и в ресторанном бизнесе.',
};

export default function VacanciesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
