'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Zap, Check, Crown, BarChart2, Send, FileText, Shield, Repeat } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { cn } from '@/lib/utils';
import { MyBoostsSection } from '@/components/subscription/MyBoostsSection';
import { ComparePlansButton } from '@/components/pricing/PlanComparisonModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployerPlanDef {
  key: string;
  label: string;
  price: number;
  maxActiveVacancies: number;
  monthlyInvitations: number;
  hasFullCatalog: boolean;
  hasAnalytics: boolean;
  maxTemplates: number;
  monthlyBoosts: number;
  hasVerifiedBadge: boolean;
}

interface SubscriptionData {
  key: string;
  label: string;
  price: number;
  maxActiveVacancies: number;
  monthlyInvitations: number;
  hasFullCatalog: boolean;
  hasAnalytics: boolean;
  maxTemplates: number;
  monthlyBoosts: number;
  hasVerifiedBadge: boolean;
  status: string;
  currentPeriodEnd: string | null;
  grantedByAdmin: boolean;
  isExpired: boolean;
  boostCredits?: number;
  usage: {
    vacancies: { allowed: boolean; current: number; limit: number; plan: string };
    invitations: { allowed: boolean; used: number; limit: number; plan: string };
  };
  plans: Record<string, EmployerPlanDef>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function FeatureRow({ included, text }: { included: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]',
          included ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] text-white/30',
        )}
      >
        {included ? '✓' : '×'}
      </span>
      <span className={cn('text-sm', included ? 'text-white/80' : 'text-white/35 line-through')}>{text}</span>
    </div>
  );
}

function limitLabel(val: number, unit = '') {
  if (val === -1) return `Безлимит${unit ? ' ' + unit : ''}`;
  if (val === 0) return '—';
  return `${val}${unit ? ' ' + unit : ''}`;
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  isPopular,
  onSelect,
  paying,
}: {
  plan: EmployerPlanDef;
  isCurrent: boolean;
  isPopular: boolean;
  onSelect?: () => void;
  paying: boolean;
}) {
  const canUpgrade = !isCurrent && plan.key !== 'free' && plan.key !== 'enterprise';

  return (
    <section
      className={cn(
        'relative rounded-[16px] border p-5 transition',
        isPopular
          ? 'border-emerald-500/35 bg-emerald-500/6'
          : 'border-white/[0.08] bg-white/[0.03]',
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-4">
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-black">
            Рекомендуем
          </span>
        </div>
      )}

      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-white/90">{plan.label}</h3>
        {isCurrent && (
          <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
            Активен
          </span>
        )}
      </div>
      <div className="mb-4">
        {plan.price > 0 ? (
          <>
            <span className="text-2xl font-bold text-white/90">{plan.price.toLocaleString('ru-RU')} ₽</span>
            <span className="ml-1 text-xs text-white/45">/мес</span>
          </>
        ) : (
          <span className="text-2xl font-bold text-white/60">Бесплатно</span>
        )}
      </div>

      <div className="space-y-2">
        <FeatureRow included text={`${limitLabel(plan.maxActiveVacancies)} активных вакансий`} />
        <FeatureRow included={plan.monthlyInvitations !== 0} text={`${limitLabel(plan.monthlyInvitations)} приглашений/мес`} />
        <FeatureRow included={plan.hasFullCatalog} text="Полный каталог + VIP-работники" />
        <FeatureRow included={plan.hasAnalytics} text="Аналитика вакансий" />
        <FeatureRow included={plan.maxTemplates !== 0} text={`${limitLabel(plan.maxTemplates)} шаблонов вакансий`} />
        <FeatureRow included={plan.monthlyBoosts > 0} text={`${plan.monthlyBoosts > 0 ? plan.monthlyBoosts : 0} буст${plan.monthlyBoosts > 1 ? 'а' : ''} вакансии/мес`} />
        <FeatureRow included={plan.hasVerifiedBadge} text='Бейдж "Проверенный работодатель"' />
      </div>

      {canUpgrade && (
        <button
          type="button"
          disabled={paying}
          onClick={onSelect}
          className={cn(
            'mt-5 w-full rounded-[12px] py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
            isPopular
              ? 'bg-emerald-500 text-black hover:bg-emerald-400'
              : 'border border-white/20 bg-white/[0.06] text-white/90 hover:bg-white/[0.1]',
          )}
        >
          {paying ? 'Перенаправляем…' : `Перейти на ${plan.label} — ${plan.price.toLocaleString('ru-RU')} ₽/мес`}
        </button>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployerSubscriptionPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    void (async () => {
      if (searchParams.get('payment_status') === 'success') {
        try {
          const res = await apiClient.post<{ data: { granted: number } }>('/payments/verify', {});
          toast(
            res.data.granted > 0
              ? 'Оплата подтверждена! Услуга активирована.'
              : 'Оплата получена. Статус обновится в течение минуты.',
            res.data.granted > 0 ? 'success' : 'info',
          );
        } catch {
          toast('Оплата получена, проверяем статус…', 'info');
        }
      }
      try {
        const r = await apiClient.get<{ data: SubscriptionData }>('/subscriptions/employer/me');
        setData(r.data);
      } catch {
        toast('Не удалось загрузить данные подписки', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, toast]);

  const handleCheckout = async (plan: string) => {
    setPaying(true);
    try {
      const res = await apiClient.post<{ data: { paymentUrl: string } }>(
        '/subscriptions/employer/checkout',
        { plan },
      );
      window.location.href = res.data.paymentUrl;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось создать платёж', 'error');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-64 rounded-xl bg-white/[0.06]" />
        <div className="h-40 rounded-[18px] bg-white/[0.04]" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-72 rounded-[18px] bg-white/[0.04]" />)}
        </div>
      </div>
    );
  }

  const currentPlanKey = data?.key ?? 'free';
  const vac = data?.usage.vacancies;
  const inv = data?.usage.invitations;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white/90">Подписка</h1>
          <p className="mt-1 text-sm text-white/45">Управление тарифом и доступными функциями</p>
        </div>
        <ComparePlansButton
          initialAudience="employer"
          label="Сравнить тарифы наглядно"
          variant="outline"
        />
      </div>

      {/* Купленные бусты — ручная активация */}
      <MyBoostsSection audience="employer" />

      {/* Current plan status */}
      <section
        className={cn(
          'rounded-[16px] border p-5',
          currentPlanKey !== 'free'
            ? 'border-emerald-500/30 bg-emerald-500/8'
            : 'border-white/[0.08] bg-white/[0.03]',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-[12px]',
                currentPlanKey !== 'free' ? 'bg-emerald-500/20' : 'bg-white/[0.06]',
              )}
            >
              {currentPlanKey !== 'free' ? (
                <Crown className="h-5 w-5 text-emerald-300" />
              ) : (
                <Zap className="h-5 w-5 text-white/40" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-white/90">
                  Тариф {data?.label ?? 'Старт'}
                </span>
                {data?.grantedByAdmin && (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                    Выдано администратором
                  </span>
                )}
              </div>
              {currentPlanKey !== 'free' && data?.currentPeriodEnd ? (
                <p className="text-xs text-white/45">Активен до {formatDate(data.currentPeriodEnd)}</p>
              ) : (
                <p className="text-xs text-white/45">Базовый тариф</p>
              )}
            </div>
          </div>

          {/* Usage stats */}
          <div className="flex flex-wrap gap-6 text-sm">
            {vac && (
              <div className="text-right">
                <p className="text-white/50">Активных вакансий</p>
                <p className="font-semibold text-white/90">
                  {vac.limit === -1 ? `${vac.current} / ∞` : `${vac.current} / ${vac.limit}`}
                </p>
              </div>
            )}
            {inv && inv.limit !== 0 && (
              <div className="text-right">
                <p className="text-white/50">Приглашений в месяц</p>
                <p className="font-semibold text-white/90">
                  {inv.limit === -1 ? `${inv.used} / ∞` : `${inv.used} / ${inv.limit}`}
                </p>
              </div>
            )}
            {(data?.boostCredits ?? 0) > 0 && (
              <div className="text-right">
                <p className="text-white/50">Бусты на балансе</p>
                <p className="font-semibold text-amber-300">{data!.boostCredits} шт.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {data?.plans &&
          Object.values(data.plans)
            .filter((p) => p.key !== 'enterprise')
            .map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                isCurrent={plan.key === currentPlanKey}
                isPopular={plan.key === 'basic'}
                onSelect={() => void handleCheckout(plan.key)}
                paying={paying}
              />
            ))}
      </div>

      {/* Feature details */}
      <section className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-white/90">Что включено в платные тарифы</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-emerald-500/15">
              <FileText className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Больше вакансий</p>
              <p className="mt-0.5 text-xs text-white/50">
                Бизнес — до 15 активных. Про — безлимит. На Старте доступно только 3.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-sky-500/15">
              <Send className="h-4 w-4 text-sky-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Прямые приглашения</p>
              <p className="mt-0.5 text-xs text-white/50">
                Приглашайте работников из каталога — 30/мес на Бизнес, безлимит на Про.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-purple-500/15">
              <BarChart2 className="h-4 w-4 text-purple-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Аналитика вакансий</p>
              <p className="mt-0.5 text-xs text-white/50">
                Просмотры, отклики, конверсии по каждой вакансии в реальном времени.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-amber-500/15">
              <Crown className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Бейдж «Проверенный»</p>
              <p className="mt-0.5 text-xs text-white/50">
                Зелёная галочка на профиле и вакансиях — повышает доверие работников.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-rose-500/15">
              <Zap className="h-4 w-4 text-rose-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Бусты вакансий</p>
              <p className="mt-0.5 text-xs text-white/50">
                Поднимайте вакансию в топ каталога — 1 буст/мес на Бизнес, 3 на Про.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-teal-500/15">
              <Shield className="h-4 w-4 text-teal-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Приоритетная поддержка</p>
              <p className="mt-0.5 text-xs text-white/50">
                Ваши запросы обрабатываются в приоритетном порядке.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-5">
        <h2 className="mb-3 text-[15px] font-semibold text-white/90">Вопросы</h2>
        <div className="space-y-3 text-sm text-white/65">
          <p>
            <span className="font-medium text-white/85">Когда активируется тариф?</span>{' '}
            Сразу после подтверждения оплаты — обычно в течение 1–2 минут.
          </p>
          <p>
            <span className="font-medium text-white/85">Автопродление?</span>{' '}
            Нет. Тариф действует 1 месяц без автоматического продления.
          </p>
          <p>
            <span className="font-medium text-white/85">Нужен тариф Enterprise?</span>{' '}
            Напишите нам:{' '}
            <a href="mailto:Event-Unity@yandex.ru" className="text-emerald-300 hover:underline">
              Event-Unity@yandex.ru
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
