import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlus, FileText, Search, MessageSquare, CalendarCheck, Star, ArrowRight } from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Как это работает',
  description: 'Пошаговое руководство по работе с платформой Юнити: регистрация, поиск персонала, отклики, смены и оплата. Просто и прозрачно.',
  alternates: { canonical: '/how-it-works' },
};

const EMPLOYER_STEPS = [
  {
    icon: UserPlus,
    title: 'Зарегистрируйтесь',
    desc: 'Создайте аккаунт компании за минуту.',
  },
  {
    icon: FileText,
    title: 'Опубликуйте вакансию',
    desc: 'Заполните форму или используйте готовый шаблон — это займёт 5 минут.',
  },
  {
    icon: Search,
    title: 'Получите отклики',
    desc: 'Просматривайте профили кандидатов, изучайте опыт и отзывы.',
  },
  {
    icon: MessageSquare,
    title: 'Обсудите детали',
    desc: 'Свяжитесь с кандидатом через встроенный чат платформы.',
  },
  {
    icon: CalendarCheck,
    title: 'Подтвердите смену',
    desc: 'Забронируйте специалиста на нужную дату и время.',
  },
  {
    icon: Star,
    title: 'Оцените работу',
    desc: 'После завершения оставьте отзыв — это поможет другим работодателям.',
  },
];

const WORKER_STEPS = [
  {
    icon: UserPlus,
    title: 'Создайте профиль',
    desc: 'Укажите специализацию, опыт, загрузите фото.',
  },
  {
    icon: Search,
    title: 'Найдите вакансии',
    desc: 'Просматривайте каталог или получайте персональные рекомендации.',
  },
  {
    icon: MessageSquare,
    title: 'Откликнитесь',
    desc: 'Одним кликом или с сопроводительным сообщением.',
  },
  {
    icon: CalendarCheck,
    title: 'Выйдите на смену',
    desc: 'Подтвердите участие и выполните работу профессионально.',
  },
  {
    icon: Star,
    title: 'Развивайте репутацию',
    desc: 'Получайте отзывы и повышайте свой рейтинг в каталоге.',
  },
];

function StepCard({ step, index }: { step: typeof EMPLOYER_STEPS[0]; index: number }) {
  const Icon = step.icon;
  return (
    <div className="how-step-card group">
      {/* Number badge */}
      <div className="how-step-badge">
        {index + 1}
      </div>

      {/* Title */}
      <h3
        className="how-step-title"
      >
        {step.title}
      </h3>

      {/* Description */}
      <p className="how-step-desc">
        {step.desc}
      </p>

      {/* Icon (decorative) */}
      <div className="mt-4 flex justify-end opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="h-8 w-8 text-white" aria-hidden="true" />
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--u-bg-dark)' }}
    >
      <BreadcrumbJsonLd items={[{ name: 'Главная', path: '/' }, { name: 'Как это работает', path: '/how-it-works' }]} />
      <div className="container-page py-16 lg:py-24">

        {/* Page header */}
        <div className="text-center mb-16">
          <h1
            className="text-white"
            style={{
              fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            Как работает Юнити
          </h1>
          <p
            className="mx-auto mt-3 max-w-2xl text-[1.0625rem]"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            Простой и прозрачный процесс для работодателей и специалистов
          </p>
        </div>

        {/* Employer flow */}
        <section aria-labelledby="employers-heading">
          <h2
            id="employers-heading"
            className="text-center mb-8 text-white"
            style={{
              fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
              fontSize: 'clamp(1.375rem, 2.5vw, 1.75rem)',
              fontWeight: 600,
            }}
          >
            Для работодателей
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EMPLOYER_STEPS.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>
        </section>

        {/* Worker flow */}
        <section className="mt-20" aria-labelledby="workers-heading">
          <h2
            id="workers-heading"
            className="text-center mb-8 text-white"
            style={{
              fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
              fontSize: 'clamp(1.375rem, 2.5vw, 1.75rem)',
              fontWeight: 600,
            }}
          >
            Для специалистов
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WORKER_STEPS.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-[12px] px-8 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'var(--u-gradient-primary)',
              boxShadow: '0 4px 16px rgba(45,106,74,0.3)',
            }}
          >
            Создать аккаунт — бесплатно
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
