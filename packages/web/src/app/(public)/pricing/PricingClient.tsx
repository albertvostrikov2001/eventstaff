'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, X, ShoppingCart, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { ComparePlansButton } from '@/components/pricing/PlanComparisonModal';

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
  sku: string;
  title: string;
  price: string;
  period?: string;
  badge: string | null;
  desc: string;
  /** Для бустов работодателя, привязанных к конкретной вакансии. */
  needsVacancy?: boolean;
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
      '3 прямых приглашения в месяц',
      'Только входящие отклики',
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
  { sku: 'employer_top_24h', needsVacancy: true, title: 'Топ-буст на 24 часа', price: '490 ₽', badge: null, desc: 'Вакансия в топе каталога 24 часа. Подходит для срочного найма.' },
  { sku: 'employer_top_7d', needsVacancy: true, title: 'Топ-буст на 7 дней', price: '1 990 ₽', badge: null, desc: 'Вакансия в топе каталога целую неделю. Подходит для планового найма.' },
  { sku: 'employer_highlight_7d', needsVacancy: true, title: 'Выделение цветом', price: '290 ₽', badge: null, desc: 'Рамка и подсветка вакансии в каталоге на 7 дней — повышает CTR.' },
  { sku: 'employer_pack5', title: 'Пакет «5 бустов»', price: '1 990 ₽', badge: 'Выгодно', desc: '5 топ-бустов на ваш баланс. Применяйте к любым вакансиям.' },
];

const WORKER_BOOSTS: Boost[] = [
  { sku: 'worker_top_3d', title: 'Буст анкеты в топ', price: '149 ₽', period: '3 дня', badge: null, desc: 'Анкета в топе каталога категории на 3 дня.' },
  { sku: 'worker_top_7d', title: 'Буст анкеты в топ', price: '299 ₽', period: '7 дней', badge: null, desc: 'Анкета в топе категории на неделю.' },
  { sku: 'worker_unlimited_30d', title: 'Безлимитные отклики', price: '199 ₽', period: '1 месяц', badge: null, desc: 'Отклики без ограничений на месяц без подписки.' },
  { sku: 'worker_recommended_30d', title: 'Бейдж «Рекомендован платформой»', price: '490 ₽', period: '30 дней', badge: 'Премиум', desc: 'Эксклюзивный бейдж в каталоге на 30 дней.' },
];

// ─── Vacancy picker modal (для бустов работодателя, привязанных к вакансии) ──────
interface PickVacancy { id: string; title: string }

function VacancyPickerModal({
  boost,
  onPick,
  onClose,
  submitting,
}: {
  boost: Boost;
  onPick: (vacancyId: string) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [vacancies, setVacancies] = useState<PickVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: PickVacancy[] }>('/employer/vacancies', { limit: 50 })
      .then((res) => setVacancies(res.data ?? []))
      .catch(() => setError('Не удалось загрузить вакансии'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md rounded-[18px] p-6 shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, rgba(20,35,25,0.98) 0%, rgba(10,18,14,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.08] hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: 'var(--u-emerald, #2d6a4a)', opacity: 0.8 }}>
            <Zap className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-playfair, "Playfair Display", serif)' }}>
            {boost.title} — {boost.price}
          </h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Выберите вакансию, к которой применить:
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-white/50">Загрузка вакансий…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        ) : vacancies.length === 0 ? (
          <div className="mt-4 text-sm text-white/60">
            <p>У вас пока нет вакансий для буста.</p>
            <Link href="/employer/vacancies/new" className="mt-2 inline-block font-medium underline text-emerald-300">
              Создать вакансию →
            </Link>
          </div>
        ) : (
          <div className="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
            {vacancies.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelected(v.id)}
                className={`block w-full rounded-[10px] px-3 py-2.5 text-left text-sm transition ${
                  selected === v.id ? 'text-white' : 'text-white/70 hover:bg-white/[0.06]'
                }`}
                style={
                  selected === v.id
                    ? { background: 'rgba(45,106,74,0.35)', border: '1px solid rgba(79,167,110,0.6)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {v.title}
              </button>
            ))}
          </div>
        )}

        {vacancies.length > 0 && (
          <button
            type="button"
            disabled={!selected || submitting}
            onClick={() => selected && onPick(selected)}
            className="mt-5 w-full rounded-[10px] py-3 text-center text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'var(--u-gradient-primary, linear-gradient(135deg,#2d6a4a,#4fa76e))' }}
          >
            {submitting ? 'Открываем оплату…' : `Оплатить ${boost.price}`}
          </button>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  href,
  onBuy,
  loading,
}: {
  plan: Plan;
  href: string;
  /** Если задан — кнопка инициирует оплату (авторизованный платный тариф). */
  onBuy?: () => void;
  loading?: boolean;
}) {
  const ctaClassName = `mt-6 block w-full text-center rounded-[10px] py-3.5 text-[0.9375rem] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
    plan.ctaVariant === 'primary'
      ? 'hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(45,106,74,0.4)]'
      : 'hover:border-white/50'
  }`;
  const ctaStyle =
    plan.ctaVariant === 'primary'
      ? { background: 'var(--u-gradient-primary)', color: '#ffffff' }
      : {
          border: '1.5px solid rgba(255,255,255,0.3)',
          background: 'transparent',
          color: 'rgba(255,255,255,0.85)',
        };

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
      {onBuy ? (
        <button type="button" onClick={onBuy} disabled={loading} className={ctaClassName} style={ctaStyle}>
          {loading ? 'Открываем оплату…' : plan.cta}
        </button>
      ) : (
        <Link href={href} className={ctaClassName} style={ctaStyle}>
          {plan.cta}
        </Link>
      )}
    </div>
  );
}

// id тарифа на витрине → ключ плана для checkout-эндпоинта.
// Бесплатные тарифы (start/free) сюда не входят — они без оплаты.
const CHECKOUT_PLAN: Record<string, string> = {
  business: 'basic',
  pro: 'pro',
  premium: 'premium',
};

// Куда ведёт кнопка тарифа (режим ссылки — для гостя и бесплатного тарифа):
// гостя — на регистрацию (как раньше), авторизованного на бесплатном — в дашборд.
function resolvePlanHref(plan: Plan, tab: Tab, loggedIn: boolean): string {
  if (!loggedIn) return plan.ctaHref;
  return tab === 'employer' ? '/employer/dashboard' : '/worker/dashboard';
}

export default function PricingClient() {
  const [tab, setTab] = useState<Tab>('employer');
  const [payingPlan, setPayingPlan] = useState<string | null>(null);
  const [payingBoost, setPayingBoost] = useState<string | null>(null);
  const [vacancyPickerBoost, setVacancyPickerBoost] = useState<Boost | null>(null);
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  const plans = tab === 'employer' ? EMPLOYER_PLANS : WORKER_PLANS;
  const boosts = tab === 'employer' ? EMPLOYER_BOOSTS : WORKER_BOOSTS;
  const gridCols = tab === 'employer' ? 'lg:grid-cols-3' : 'lg:grid-cols-2';

  // Авторизованный + платный тариф + совпадает роль → оплата прямо отсюда.
  async function handleBuyPlan(plan: Plan) {
    const planKey = CHECKOUT_PLAN[plan.id];
    if (!planKey) return;
    const needRole: 'employer' | 'worker' = tab === 'employer' ? 'employer' : 'worker';
    if (!user?.roles?.includes(needRole)) {
      toast(
        `Этот тариф для роли «${needRole === 'employer' ? 'работодатель' : 'специалист'}». Войдите в нужной роли, чтобы оформить.`,
        'error',
      );
      return;
    }
    setPayingPlan(plan.id);
    try {
      const endpoint =
        needRole === 'employer' ? '/subscriptions/employer/checkout' : '/subscriptions/worker/checkout';
      const res = await apiClient.post<{ data: { paymentUrl: string } }>(endpoint, { plan: planKey });
      window.location.href = res.data.paymentUrl;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось создать платёж', 'error');
      setPayingPlan(null);
    }
  }

  // Покупка буста: гость → регистрация; неверная роль → подсказка;
  // буст с вакансией → модал выбора; иначе → сразу оплата.
  function handleBuyBoost(boost: Boost) {
    if (!user) {
      window.location.href = '/auth/register';
      return;
    }
    const needRole: 'employer' | 'worker' = tab === 'employer' ? 'employer' : 'worker';
    if (!user.roles?.includes(needRole)) {
      toast(
        `Эта услуга для роли «${needRole === 'employer' ? 'работодатель' : 'специалист'}». Войдите в нужной роли.`,
        'error',
      );
      return;
    }
    if (boost.needsVacancy) {
      setVacancyPickerBoost(boost);
      return;
    }
    void doBoostCheckout(boost);
  }

  async function doBoostCheckout(boost: Boost, vacancyId?: string) {
    setPayingBoost(boost.sku);
    try {
      const endpoint =
        tab === 'employer' ? '/subscriptions/employer/boost-checkout' : '/subscriptions/worker/boost-checkout';
      const body = tab === 'employer' ? { sku: boost.sku, vacancyId } : { sku: boost.sku };
      const res = await apiClient.post<{ data: { paymentUrl: string } }>(endpoint, body);
      window.location.href = res.data.paymentUrl;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось создать платёж', 'error');
      setPayingBoost(null);
      setVacancyPickerBoost(null);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--u-bg-dark)' }}
    >
      {vacancyPickerBoost && (
        <VacancyPickerModal
          boost={vacancyPickerBoost}
          submitting={payingBoost === vacancyPickerBoost.sku}
          onPick={(vacancyId) => void doBoostCheckout(vacancyPickerBoost, vacancyId)}
          onClose={() => setVacancyPickerBoost(null)}
        />
      )}
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
          <div className="mt-6 flex justify-center">
            <ComparePlansButton initialAudience={tab} label="Сравнить тарифы наглядно" />
          </div>
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
          {plans.map((plan) => {
            const isPaid = !!CHECKOUT_PLAN[plan.id];
            const canBuyHere = !!user && isPaid;
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                href={resolvePlanHref(plan, tab, !!user)}
                onBuy={canBuyHere ? () => void handleBuyPlan(plan) : undefined}
                loading={payingPlan === plan.id}
              />
            );
          })}
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
                className="relative flex flex-col rounded-[14px] p-5"
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
                <p className="mt-1.5 text-[0.9375rem] font-medium text-white leading-snug">
                  {b.title}
                </p>
                <p className="mt-1.5 flex-1 text-[0.8125rem] leading-[1.5]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {b.desc}
                </p>
                <button
                  type="button"
                  onClick={() => handleBuyBoost(b)}
                  disabled={payingBoost === b.sku}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[9px] py-2.5 text-sm font-semibold transition-all hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(45,106,74,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--u-gradient-primary, linear-gradient(135deg,#2d6a4a,#4fa76e))',
                    color: '#ffffff',
                  }}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {payingBoost === b.sku ? 'Открываем оплату…' : 'Купить'}
                </button>
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
