'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

type Tab = 'employer' | 'worker';
type CtaVariant = 'primary' | 'outline';

interface Plan {
  id: string;
  name: string;
  badge: string | null;
  price: string;
  period: string;
  description: string;
  note: string | null;
  highlighted: boolean;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaVariant: CtaVariant;
}

interface Boost {
  title: string;
  price: string;
  period?: string;
  badge: string | null;
  desc: string;
}

const EMPLOYER_PLANS: Plan[] = [
  {
    id: 'start',
    name: 'Старт',
    badge: null,
    price: '0',
    period: 'навсегда',
    description: 'Попробуйте платформу бесплатно',
    note: 'Дополнительная вакансия разово — 490 ₽',
    highlighted: false,
    features: [
      'До 3 активных вакансий',
      'Только отклики на ваши вакансии',
      'Базовая поддержка',
    ],
    cta: 'Начать бесплатно',
    ctaHref: '/auth/register?role=employer',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'business',
    name: 'Бизнес',
    badge: 'Рекомендуем',
    price: '1 990',
    period: 'в месяц',
    description: 'Для активного найма персонала',
    note: null,
    highlighted: true,
    features: [
      'До 15 активных вакансий',
      'Полный каталог + Vip-сотрудники',
      '30 прямых приглашений в месяц',
      'Аналитика по вакансиям',
      '5 шаблонов вакансий',
      'Приоритетная поддержка',
      '1 бесплатный буст вакансии в месяц',
      'Бейдж «Проверенный работодатель»',
    ],
    cta: 'Подключить Бизнес',
    ctaHref: '/auth/register?role=employer',
    ctaVariant: 'primary' as const,
  },
  {
    id: 'pro',
    name: 'Про',
    badge: 'Для агентств',
    price: '4 490',
    period: 'в месяц',
    description: 'Безлимит и vip-доступ для крупного найма',
    note: null,
    highlighted: false,
    features: [
      'Безлимит активных вакансий',
      'Полный каталог + Vip-сотрудники',
      'Безлимит прямых приглашений',
      'Расширенная аналитика',
      'Безлимит шаблонов вакансий',
      'Приоритетная поддержка (расширенная)',
      '3 бесплатных буста вакансии в месяц',
      'Бейдж «Проверенный работодатель»',
    ],
    cta: 'Подключить Про',
    ctaHref: '/auth/register?role=employer',
    ctaVariant: 'outline' as const,
  },
];

const WORKER_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Бесплатно',
    badge: null,
    price: '0',
    period: 'навсегда',
    description: 'Базовый доступ к платформе',
    note: null,
    highlighted: false,
    features: [
      'Полная анкета',
      '5 откликов в месяц',
      'Стандартное место в каталоге',
    ],
    cta: 'Создать анкету',
    ctaHref: '/auth/register?role=worker',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'premium',
    name: 'Premium',
    badge: 'Популярный',
    price: '290',
    period: 'в месяц',
    description: 'Больше откликов и видимость для работодателей',
    note: null,
    highlighted: true,
    features: [
      'Безлимит откликов',
      'Премиум шаблон анкеты',
      'Бейдж «Premium»',
      'Выделение анкеты цветом в каталоге',
      'Статистика просмотров',
      'Разовый буст на 3 дня в подарок',
    ],
    cta: 'Подключить Premium',
    ctaHref: '/auth/register?role=worker',
    ctaVariant: 'primary' as const,
  },
];

const EMPLOYER_BOOSTS: Boost[] = [
  { title: 'Топ-буст на 24 часа', price: '490 ₽', badge: null, desc: 'Вакансия в топе каталога 24 часа. Подходит для срочного найма.' },
  { title: 'Топ-буст на 7 дней', price: '1 990 ₽', badge: null, desc: 'Вакансия в топе каталога целую неделю. Подходит для планового найма.' },
  { title: 'Выделение цветом', price: '290 ₽', badge: null, desc: 'Рамка и иконка «срочно» — повышает CTR.' },
  { title: 'Пакет «5 бустов»', price: '1 990 ₽', badge: 'Выгодно', desc: '5 топ-бустов по 24 часа. Идеально для регулярного найма.' },
];

const WORKER_BOOSTS: Boost[] = [
  { title: 'Буст анкеты в топ', price: '149 ₽', period: '3 дня', badge: null, desc: 'Анкета в топе каталога категории на 3 дня.' },
  { title: 'Буст анкеты в топ', price: '299 ₽', period: '7 дней', badge: null, desc: 'Анкета в топе категории на неделю.' },
  { title: 'Безлимитные отклики', price: '199 ₽', period: '1 месяц', badge: null, desc: 'Отклики без ограничений на месяц без подписки.' },
  { title: 'Бейдж «Рекомендован платформой»', price: '490 ₽', period: '30 дней', badge: 'Премиум', desc: 'Эксклюзивный бейдж в каталоге.' },
];

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className="relative rounded-[16px] p-7 flex flex-col"
      style={
        plan.highlighted
          ? {
              border: '1.5px solid var(--u-emerald-light)',
              background: 'linear-gradient(180deg, rgba(45,106,74,0.08) 0%, rgba(255,255,255,0.04) 100%)',
              boxShadow: '0 0 40px rgba(45, 106, 74, 0.15)',
            }
          : {
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
            }
      }
    >
      {/* Badge */}
      {plan.badge && (
        <span
          className="absolute -top-3 right-6 text-xs font-semibold text-white px-3 py-1 rounded-full"
          style={{ background: 'var(--u-emerald)' }}
        >
          {plan.badge}
        </span>
      )}

      {/* Header */}
      <div>
        <h3
          className="text-2xl font-semibold text-white"
          style={{ fontFamily: 'var(--font-playfair, "Playfair Display", serif)' }}
        >
          {plan.name}
        </h3>
        <p className="mt-1.5 text-[0.9375rem]" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {plan.description}
        </p>
      </div>

      {/* Price */}
      <div className="mt-5 flex items-baseline gap-1">
        <span
          className="font-semibold text-white"
          style={{
            fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
            fontSize: '2.75rem',
            lineHeight: 1,
          }}
        >
          {plan.price}
        </span>
        {plan.price !== '0' && (
          <span className="text-[1.5rem] text-white" style={{ lineHeight: 1 }}>₽</span>
        )}
        {plan.price === '0' && (
          <span className="text-[1.5rem] text-white" style={{ lineHeight: 1 }}>₽</span>
        )}
        <span className="ml-1 text-[0.875rem]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          / {plan.period}
        </span>
      </div>

      {/* Features */}
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: 'var(--u-emerald-light)' }}
              aria-hidden="true"
            />
            <span className="text-[0.9375rem] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      {/* Note */}
      {plan.note && (
        <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {plan.note}
        </p>
      )}

      {/* CTA */}
      <Link
        href={plan.ctaHref}
        className="mt-6 block w-full text-center rounded-[10px] py-3.5 text-[0.9375rem] font-semibold transition-all"
        style={
          plan.ctaVariant === 'primary'
            ? {
                background: 'var(--u-gradient-primary)',
                color: '#ffffff',
              }
            : {
                border: '1.5px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.85)',
              }
        }
        onMouseEnter={(e) => {
          if (plan.ctaVariant === 'primary') {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(45,106,74,0.4)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '';
          (e.currentTarget as HTMLElement).style.transform = '';
        }}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

export default function PricingClient() {
  const [tab, setTab] = useState<Tab>('employer');

  const plans = tab === 'employer' ? EMPLOYER_PLANS : WORKER_PLANS;
  const boosts = tab === 'employer' ? EMPLOYER_BOOSTS : WORKER_BOOSTS;
  const gridCols = tab === 'employer' ? 'lg:grid-cols-3' : 'lg:grid-cols-2';

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--u-bg-dark)' }}
    >
      <div className="container-page py-16 lg:py-24">

        {/* Hero */}
        <div className="text-center">
          <h1
            className="text-white"
            style={{
              fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            Тарифы
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[1.0625rem]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Выберите подходящий план для работы с платформой
          </p>
        </div>

        {/* Toggle */}
        <div className="mt-10 flex justify-center">
          <div
            className="inline-flex rounded-[12px] p-1"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            role="tablist"
            aria-label="Выбор типа тарифа"
          >
            {(['employer', 'worker'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className="rounded-[9px] px-6 py-2.5 text-[0.9375rem] font-medium transition-all"
                style={
                  tab === t
                    ? {
                        background: 'var(--u-gradient-primary)',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(45,106,74,0.3)',
                      }
                    : {
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.6)',
                      }
                }
              >
                {t === 'employer' ? 'Для работодателей' : 'Для работников'}
              </button>
            ))}
          </div>
        </div>

        {/* Plans grid */}
        <div
          key={tab}
          className={`mt-12 grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-6`}
          style={{ animation: 'fade-in-pricing 0.3s ease' }}
        >
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* One-time services */}
        <div className="mt-20">
          <h2
            className="text-center text-white mb-2"
            style={{
              fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
              fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
              fontWeight: 600,
            }}
          >
            Разовые услуги
          </h2>
          <p className="text-center text-[0.9375rem] mb-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {tab === 'employer' ? 'Продвижение вакансий' : 'Продвижение анкет'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {boosts.map((b, i) => (
              <div
                key={i}
                className="relative rounded-[14px] p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {b.badge && (
                  <span
                    className="inline-block mb-2 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: 'var(--u-emerald)', color: '#fff' }}
                  >
                    {b.badge}
                  </span>
                )}
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span
                    className="text-xl font-semibold text-white"
                    style={{ fontFamily: 'var(--font-playfair, "Playfair Display", serif)' }}
                  >
                    {b.price}
                  </span>
                  {b.period && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      / {b.period}
                    </span>
                  )}
                </div>
                <p
                  className="mt-1.5 text-[0.9375rem] font-medium text-white leading-snug"
                >
                  {b.title}
                </p>
                <p className="mt-1.5 text-[0.8125rem] leading-[1.5]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-pricing {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
