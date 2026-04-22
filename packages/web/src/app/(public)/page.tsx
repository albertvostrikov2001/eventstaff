import Link from 'next/link';
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

      {/* ── Benefits grid ── */}
      <section
        className="section-taper-into-cta py-20"
        style={{ background: '#ffffff' }}
        aria-labelledby="benefits-heading"
      >
        <div className="container-page">
          <ScrollReveal>
            <div className="section-header">
              <h2 id="benefits-heading" className="section-title-dark">
                Всё что нужно — в одном месте
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Employers card */}
            <ScrollReveal>
              <div
                className="rounded-[var(--u-radius-lg)] border p-8 h-full"
                style={{
                  borderColor: 'var(--u-border-dark)',
                  boxShadow: 'var(--u-shadow-card)',
                }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl mb-5"
                  style={{ background: 'rgba(45,106,74,0.08)' }}
                >
                  <Briefcase
                    className="h-6 w-6"
                    strokeWidth={1.5}
                    style={{ color: 'var(--u-emerald)' }}
                    aria-hidden="true"
                  />
                </div>
                <h3
                  className="text-xl font-semibold mb-5"
                  style={{ color: 'var(--u-text-dark)' }}
                >
                  Для работодателей
                </h3>
                <ul className="space-y-3 mb-6">
                  {[
                    'Публикуйте вакансию за 5 минут',
                    'Получите отклики от проверенных специалистов',
                    'Бронируйте работника на конкретную дату',
                    'Оценивайте и приглашайте повторно',
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm"
                      style={{ color: 'var(--u-text-dark-sub)' }}
                    >
                      <CheckCircle
                        className="mt-0.5 h-4 w-4 flex-shrink-0"
                        style={{ color: 'var(--u-emerald)' }}
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/for-employers"
                  className="inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                  style={{ color: 'var(--u-emerald)' }}
                >
                  Подробнее <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </ScrollReveal>

            {/* Workers card */}
            <ScrollReveal>
              <div
                className="rounded-[var(--u-radius-lg)] border p-8 h-full"
                style={{
                  borderColor: 'var(--u-border-dark)',
                  boxShadow: 'var(--u-shadow-card)',
                }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl mb-5"
                  style={{ background: 'rgba(139,90,58,0.1)' }}
                >
                  <Users
                    className="h-6 w-6"
                    strokeWidth={1.5}
                    style={{ color: '#8b5a3a' }}
                    aria-hidden="true"
                  />
                </div>
                <h3
                  className="text-xl font-semibold mb-5"
                  style={{ color: 'var(--u-text-dark)' }}
                >
                  Для специалистов
                </h3>
                <ul className="space-y-3 mb-6">
                  {[
                    'Создайте профессиональный профиль',
                    'Управляйте расписанием и доступностью',
                    'Получайте приглашения напрямую',
                    'Развивайте репутацию через отзывы',
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm"
                      style={{ color: 'var(--u-text-dark-sub)' }}
                    >
                      <CheckCircle
                        className="mt-0.5 h-4 w-4 flex-shrink-0"
                        style={{ color: '#8b5a3a' }}
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/for-workers"
                  className="inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                  style={{ color: '#8b5a3a' }}
                >
                  Подробнее <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </ScrollReveal>
          </div>
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
