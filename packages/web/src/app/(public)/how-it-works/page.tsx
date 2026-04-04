import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlus, FileText, Search, MessageSquare, CalendarCheck, Star, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Как это работает',
  description: 'Узнайте, как работает платформа Юнити для поиска event-персонала',
};

const EMPLOYER_STEPS = [
  { icon: UserPlus, title: 'Зарегистрируйтесь', desc: 'Создайте аккаунт работодателя и заполните профиль компании' },
  { icon: FileText, title: 'Опубликуйте вакансию', desc: 'Заполните форму или используйте готовый шаблон — это займёт 5 минут' },
  { icon: Search, title: 'Получите отклики', desc: 'Просматривайте анкеты кандидатов, изучайте портфолио и отзывы' },
  { icon: MessageSquare, title: 'Обсудите детали', desc: 'Свяжитесь с кандидатом через встроенный чат платформы' },
  { icon: CalendarCheck, title: 'Подтвердите смену', desc: 'Забронируйте специалиста на нужную дату и время' },
  { icon: Star, title: 'Оцените работу', desc: 'После завершения оставьте отзыв — это поможет другим работодателям' },
];

const WORKER_STEPS = [
  { icon: UserPlus, title: 'Создайте профиль', desc: 'Укажите специализацию, опыт, загрузите фото и портфолио' },
  { icon: Search, title: 'Ищите вакансии', desc: 'Просматривайте каталог или получайте персональные рекомендации' },
  { icon: MessageSquare, title: 'Откликнитесь', desc: 'Одним кликом или с сопроводительным сообщением' },
  { icon: CalendarCheck, title: 'Выходите на смену', desc: 'Подтвердите участие и выполните работу' },
  { icon: Star, title: 'Развивайте репутацию', desc: 'Получайте отзывы и повышайте свой рейтинг' },
];

export default function HowItWorksPage() {
  return (
    <div className="container-page py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Как работает Юнити</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-500">
          Простой и прозрачный процесс для работодателей и специалистов
        </p>
      </div>

      {/* Employer flow */}
      <div className="mt-16">
        <h2 className="text-center text-2xl font-bold text-gray-900">Для работодателей</h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {EMPLOYER_STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm font-bold text-primary-600">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Worker flow */}
      <div className="mt-20">
        <h2 className="text-center text-2xl font-bold text-gray-900">Для специалистов</h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {WORKER_STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100 text-sm font-bold text-secondary-600">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 text-center">
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-2 rounded-card bg-primary-500 px-8 py-3 text-base font-semibold text-white transition hover:bg-primary-600"
        >
          Начать сейчас
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
