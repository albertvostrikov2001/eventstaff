import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlus, Search, Star, Briefcase, PartyPopper, Coffee, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Для специалистов',
  description:
    'Зарабатывайте на мероприятиях с гибким графиком. Профиль, вакансии и репутация на платформе Юнити.',
};

const PLAYFAIR = 'var(--font-playfair, "Playfair Display", serif)';

const STEPS = [
  { icon: UserPlus, title: 'Регистрация', desc: 'Укажите роль «специалист» и подтвердите контакты.' },
  { icon: Briefcase, title: 'Профиль', desc: 'Специализация, опыт, фото и портфолио — чем полнее анкета, тем выше доверие.' },
  { icon: Search, title: 'Вакансии', desc: 'Ищите в каталоге или откликайтесь на подходящие смены.' },
];

const JOB_TYPES = [
  { icon: Coffee, label: 'Бар и кофе', text: 'Бармены, бариста, миксологи' },
  { icon: PartyPopper, label: 'Сервис и зал', text: 'Официанты, хостес, координаторы зала' },
  { icon: Briefcase, label: 'Организация', text: 'Координаторы событий, промо, технический персонал' },
];

export default function ForWorkersPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
      <div className="container-page py-16 lg:py-24">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-[20px] p-10 text-center sm:p-14"
          style={{
            background:
              'linear-gradient(160deg, rgba(198,132,92,0.16) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h1
            className="text-white"
            style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600, lineHeight: 1.2 }}
          >
            Для специалистов
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[1.0625rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Зарабатывайте на мероприятиях с удобным графиком. Юнити помогает находить заказы, договариваться об
            условиях и укреплять репутацию через отзывы работодателей.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register?role=worker"
              className="inline-flex items-center gap-2 rounded-[12px] px-7 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--u-gradient-primary)', boxShadow: '0 4px 16px rgba(45,106,74,0.3)' }}
            >
              Создать профиль специалиста
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/vacancies"
              className="inline-flex items-center gap-2 rounded-[12px] px-7 py-3.5 text-base font-semibold transition-all"
              style={{ border: '1.5px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }}
            >
              Смотреть вакансии
            </Link>
          </div>
        </section>

        {/* Steps */}
        <section className="mt-16">
          <h2
            className="text-center text-white"
            style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 600 }}
          >
            Как создать профиль
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-[16px] p-6"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: 'var(--u-gradient-primary)' }}
                >
                  {i + 1}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <step.icon className="h-5 w-5" style={{ color: 'var(--u-emerald-light)' }} />
                  <h3 className="font-semibold text-white">{step.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Job types */}
        <section className="mt-16">
          <h2
            className="text-center text-white"
            style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 600 }}
          >
            Какие заказы бывают
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {JOB_TYPES.map(({ icon: Icon, label, text }) => (
              <div
                key={label}
                className="rounded-[16px] p-6 transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(198,132,92,0.15)' }}
                >
                  <Icon className="h-5 w-5" style={{ color: 'var(--u-mocha, #c6845c)' }} strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 font-semibold text-white">{label}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Reputation */}
        <section className="mt-16">
          <div
            className="rounded-[16px] p-8"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'rgba(45,106,74,0.15)' }}
              >
                <Star className="h-7 w-7" style={{ color: 'var(--u-emerald-light)' }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Репутация и отзывы</h2>
                <p className="mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  После каждой смены работодатель может оставить оценку и комментарий. Высокий рейтинг помогает
                  получать больше приглашений и выбирать интересные проекты. Мы поощряем честную обратную связь с
                  обеих сторон — так формируется здоровое сообщество профессионалов.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/auth/register?role=worker"
            className="inline-flex items-center gap-2 rounded-[12px] px-8 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--u-gradient-primary)', boxShadow: '0 4px 16px rgba(45,106,74,0.3)' }}
          >
            Создать профиль специалиста
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Уже есть аккаунт?{' '}
            <Link href="/auth/login" className="font-medium" style={{ color: 'var(--u-emerald-light)' }}>
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
