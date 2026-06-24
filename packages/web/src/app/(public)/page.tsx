import type { Metadata } from 'next';
import Link from 'next/link';

// Homepage: title intentionally omitted — root layout's
// `default: 'Юнити — Платформа event-персонала'` applies directly
// without the `template: '%s | Юнити'` suffix.
export const metadata: Metadata = {
  description:
    'Специализированная платформа для подбора официантов, барменов и другого event-персонала в ресторанный бизнес. Проверенные специалисты. Быстрый найм.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Юнити — Платформа event-персонала',
    description: 'Подбор официантов, барменов и event-персонала для вашего заведения.',
    url: '/',
    type: 'website',
  },
};
import {
  Search,
  MessageSquare,
  Calendar,
  Star,
  Shield,
  Clock,
  Users,
  Briefcase,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { HeroSection }    from '@/components/home/HeroSection';
import { CategoryGrid }   from '@/components/home/CategoryGrid';
import { AudienceFunnel } from '@/components/home/AudienceFunnel';
import { StatsBanner }    from '@/components/home/StatsBanner';
import { ScrollReveal }   from '@/components/ui/ScrollReveal';

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <HeroSection />

      {/* ── Stats Banner ── */}
      <StatsBanner />

      {/* ── Audience Funnel ── */}
      <AudienceFunnel />

      {/* ── Categories ── */}
      <ScrollReveal>
        <CategoryGrid />
      </ScrollReveal>

      {/* ── How it works ──
          NOTE: Icons are rendered directly (not from dynamic array refs)
          to avoid RSC serialization issues with function references.    */}
      <section className="how-it-works-section" aria-labelledby="how-heading">
        <div className="container-page">
          <ScrollReveal>
            <div className="section-header">
              <h2 id="how-heading" className="section-title-dark">
                Как это работает
              </h2>
              <p className="section-subtitle-dark">Четыре простых шага до результата</p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">

              <div className="relative text-center">
                <div className="how-it-works-step-icon">
                  <Search className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="step-num" aria-hidden="true">1</div>
                <h3 className="mt-4 text-base font-semibold" style={{ color: 'var(--u-text-dark)' }}>
                  Найдите
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                  Просмотрите каталог проверенных специалистов или опубликуйте вакансию
                </p>
              </div>

              <div className="relative text-center">
                <div className="how-it-works-step-icon">
                  <MessageSquare className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="step-num" aria-hidden="true">2</div>
                <h3 className="mt-4 text-base font-semibold" style={{ color: 'var(--u-text-dark)' }}>
                  Свяжитесь
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                  Обсудите детали через встроенный чат платформы
                </p>
              </div>

              <div className="relative text-center">
                <div className="how-it-works-step-icon">
                  <Calendar className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="step-num" aria-hidden="true">3</div>
                <h3 className="mt-4 text-base font-semibold" style={{ color: 'var(--u-text-dark)' }}>
                  Подтвердите
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                  Забронируйте специалиста на нужную дату и время
                </p>
              </div>

              <div className="relative text-center">
                <div className="how-it-works-step-icon">
                  <Star className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="step-num" aria-hidden="true">4</div>
                <h3 className="mt-4 text-base font-semibold" style={{ color: 'var(--u-text-dark)' }}>
                  Оцените
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                  Оставьте отзыв после завершения — развивайте доверие
                </p>
              </div>

            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Trust / Why Unity ── */}
      <section
        className="py-20"
        style={{ background: 'var(--u-bg-light)' }}
        aria-labelledby="trust-heading"
      >
        <div className="container-page text-center">
          <ScrollReveal>
            <h2
              id="trust-heading"
              className="text-[length:var(--u-text-h2)] font-semibold mb-3"
              style={{ color: 'var(--u-text-dark)' }}
            >
              Доверие — основа платформы
            </h2>
            <p
              className="mx-auto max-w-xl text-base mb-14"
              style={{ color: 'var(--u-text-dark-sub)' }}
            >
              Каждый специалист и работодатель проходит верификацию. Рейтинги, отзывы и бейджи
              помогают принять правильное решение.
            </p>
          </ScrollReveal>

          <ScrollReveal>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">

              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(45,106,74,0.08)' }}
                >
                  <Shield
                    className="h-7 w-7"
                    style={{ color: 'var(--u-emerald)' }}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--u-text-dark)' }}>
                  Верификация
                </h3>
                <p className="text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                  Подтверждённые профили и контакты
                </p>
              </div>

              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(45,106,74,0.08)' }}
                >
                  <Star
                    className="h-7 w-7"
                    style={{ color: 'var(--u-emerald)' }}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--u-text-dark)' }}>
                  Отзывы
                </h3>
                <p className="text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                  Честные оценки по итогам каждой смены
                </p>
              </div>

              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(45,106,74,0.08)' }}
                >
                  <Clock
                    className="h-7 w-7"
                    style={{ color: 'var(--u-emerald)' }}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--u-text-dark)' }}>
                  Скорость
                </h3>
                <p className="text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                  Подбор персонала за считанные часы
                </p>
              </div>

            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section
        className="py-20"
        style={{ background: '#ffffff' }}
        aria-labelledby="pricing-heading"
      >
        <div className="container-page">
          <ScrollReveal>
            <div className="section-header">
              <h2 id="pricing-heading" className="section-title-dark">
                Простые и честные тарифы
              </h2>
              <p className="section-subtitle-dark">
                Начните бесплатно — платите, только когда нужно больше
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  name: 'Старт',
                  price: '0 ₽',
                  period: 'навсегда',
                  features: ['До 3 активных вакансий', 'Входящие отклики', 'Базовая поддержка'],
                  highlighted: false,
                  badge: null as string | null,
                },
                {
                  name: 'Бизнес',
                  price: '1 990 ₽',
                  period: 'в месяц',
                  features: ['До 15 вакансий', 'Полный каталог + Vip', '30 приглашений в месяц', 'Аналитика и бусты'],
                  highlighted: true,
                  badge: 'Рекомендуем',
                },
                {
                  name: 'Про',
                  price: '4 490 ₽',
                  period: 'в месяц',
                  features: ['Безлимит вакансий', 'Безлимит приглашений', 'Расширенная аналитика'],
                  highlighted: false,
                  badge: 'Для агентств',
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className="relative flex flex-col rounded-[var(--u-radius-lg)] border p-7"
                  style={
                    plan.highlighted
                      ? {
                          borderColor: 'var(--u-emerald)',
                          boxShadow: '0 8px 32px rgba(45,106,74,0.14)',
                          background: 'linear-gradient(180deg, rgba(45,106,74,0.05) 0%, #ffffff 100%)',
                        }
                      : { borderColor: 'var(--u-border-dark)', boxShadow: 'var(--u-shadow-card)' }
                  }
                >
                  {plan.badge && (
                    <span
                      className="absolute -top-3 right-6 rounded-full px-3 py-1 text-xs font-semibold text-white"
                      style={{ background: 'var(--u-emerald)' }}
                    >
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--u-text-dark)' }}>
                    {plan.name}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold" style={{ color: 'var(--u-text-dark)' }}>
                      {plan.price}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                      / {plan.period}
                    </span>
                  </div>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                        <CheckCircle
                          className="mt-0.5 h-4 w-4 flex-shrink-0"
                          style={{ color: 'var(--u-emerald)' }}
                          aria-hidden="true"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/register?role=employer"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-input py-2.5 text-sm font-semibold transition-colors"
                    style={
                      plan.highlighted
                        ? { background: 'var(--u-emerald)', color: '#ffffff' }
                        : { border: '1.5px solid var(--u-border-dark)', color: 'var(--u-text-dark)' }
                    }
                  >
                    {plan.price === '0 ₽' ? 'Начать бесплатно' : `Подключить ${plan.name}`}
                  </Link>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="mt-8 flex flex-col items-center gap-4 text-center">
              <p className="text-sm" style={{ color: 'var(--u-text-dark-sub)' }}>
                Специалистам — <span style={{ color: 'var(--u-text-dark)', fontWeight: 600 }}>бесплатно</span>,
                Premium от 290 ₽/мес за безлимит откликов и продвижение.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-input px-6 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ background: 'var(--u-emerald)' }}
              >
                Все тарифы и услуги <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <p className="text-xs" style={{ color: 'var(--u-text-dark-sub)' }}>
                Подробнее о возможностях:{' '}
                <Link href="/for-employers" className="font-medium underline" style={{ color: 'var(--u-emerald)' }}>
                  для работодателей
                </Link>
                {' · '}
                <Link href="/for-workers" className="font-medium underline" style={{ color: '#8b5a3a' }}>
                  для специалистов
                </Link>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="final-cta-section" aria-labelledby="cta-heading">
        <div className="container-page relative z-10 text-center">
          <ScrollReveal>
            <h2
              id="cta-heading"
              className="text-[length:var(--u-text-h2)] font-semibold mb-4"
              style={{
                color: 'var(--u-text-primary)',
                fontFamily: 'var(--font-playfair, Georgia, serif)',
              }}
            >
              Начните прямо сейчас
            </h2>
            <p
              className="mx-auto max-w-md text-base mb-10"
              style={{ color: 'var(--u-text-secondary)' }}
            >
              Регистрация бесплатна. Размещение вакансий — бесплатно на старте.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/register?role=employer" className="btn-hero-primary">
                <Briefcase className="h-5 w-5" aria-hidden="true" />
                Я работодатель
              </Link>
              <Link href="/auth/register?role=worker" className="btn-hero-secondary">
                <Users className="h-5 w-5" aria-hidden="true" />
                Я ищу работу
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
