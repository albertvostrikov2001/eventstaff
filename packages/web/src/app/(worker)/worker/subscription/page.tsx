'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Zap, Check, Lock, TrendingUp, Eye, MessageCircle, Crown } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkerPlanDef {
  key: string;
  label: string;
  price: number;
  applicationsPerMonth: number;
  hasPremiumBadge: boolean;
  hasHighlight: boolean;
  hasProfileStats: boolean;
  hasFreeBoost: boolean;
}

interface SubscriptionData {
  key: string;
  label: string;
  price: number;
  applicationsPerMonth: number;
  hasPremiumBadge: boolean;
  hasHighlight: boolean;
  hasProfileStats: boolean;
  hasFreeBoost: boolean;
  status: string;
  currentPeriodEnd: string | null;
  grantedByAdmin: boolean;
  isExpired: boolean;
  usage: {
    applications: { allowed: boolean; used: number; limit: number; plan: string };
  };
  plans: Record<string, WorkerPlanDef>;
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
          included
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-white/[0.06] text-white/30',
        )}
      >
        {included ? '✓' : '×'}
      </span>
      <span className={cn('text-sm', included ? 'text-white/80' : 'text-white/35 line-through')}>{text}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkerSubscriptionPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (searchParams.get('payment_status') === 'success') {
      toast('Оплата прошла успешно! Подписка активируется в течение нескольких минут.', 'success');
    }
  }, [searchParams, toast]);

  useEffect(() => {
    apiClient
      .get<{ data: SubscriptionData }>('/subscriptions/worker/me')
      .then((r) => setData(r.data))
      .catch(() => toast('Не удалось загрузить данные подписки', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleCheckout = async (plan: string) => {
    setPaying(true);
    try {
      const res = await apiClient.post<{ data: { paymentUrl: string } }>(
        '/subscriptions/worker/checkout',
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
        <div className="h-48 rounded-[18px] bg-white/[0.04]" />
        <div className="h-48 rounded-[18px] bg-white/[0.04]" />
      </div>
    );
  }

  const isPremium = data?.key === 'premium';
  const apps = data?.usage.applications;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white/90">Подписка</h1>
        <p className="mt-1 text-sm text-white/45">Управление тарифом и преимуществами</p>
      </div>

      {/* Current plan banner */}
      <section
        className={cn(
          'rounded-[16px] border p-5',
          isPremium
            ? 'border-emerald-500/30 bg-emerald-500/8'
            : 'border-white/[0.08] bg-white/[0.03]',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-[12px]',
                isPremium ? 'bg-emerald-500/20' : 'bg-white/[0.06]',
              )}
            >
              {isPremium ? (
                <Crown className="h-5 w-5 text-emerald-300" />
              ) : (
                <Zap className="h-5 w-5 text-white/40" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-white/90">
                  {data?.label ?? 'Бесплатно'}
                </span>
                {data?.grantedByAdmin && (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                    Выдано администратором
                  </span>
                )}
              </div>
              {isPremium && data?.currentPeriodEnd ? (
                <p className="text-xs text-white/45">
                  Активен до {formatDate(data.currentPeriodEnd)}
                </p>
              ) : (
                <p className="text-xs text-white/45">Базовый тариф</p>
              )}
            </div>
          </div>

          {/* Application usage */}
          {apps && (
            <div className="text-right text-sm">
              <span className="text-white/70">Откликов в этом месяце:</span>
              <span className="ml-2 font-semibold text-white/90">
                {apps.limit === -1 ? `${apps.used} / ∞` : `${apps.used} / ${apps.limit}`}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Plan comparison */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free plan */}
        <section className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-white/90">Бесплатно</h2>
              <p className="text-2xl font-bold text-white/80">0 ₽</p>
            </div>
            {!isPremium && (
              <span className="rounded-full bg-white/[0.1] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                Текущий
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            <FeatureRow included text="Полная анкета" />
            <FeatureRow included text="5 откликов в месяц" />
            <FeatureRow included text="Стандартное место в каталоге" />
            <FeatureRow included={false} text="Безлимитные отклики" />
            <FeatureRow included={false} text="Бейдж «Premium»" />
            <FeatureRow included={false} text="Выделение анкеты в каталоге" />
            <FeatureRow included={false} text="Статистика просмотров" />
            <FeatureRow included={false} text="Разовый буст анкеты" />
          </div>
        </section>

        {/* Premium plan */}
        <section className="relative rounded-[16px] border border-emerald-500/35 bg-emerald-500/6 p-5">
          <div className="absolute -top-3 left-4">
            <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-black">
              Популярный
            </span>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-white/90">Premium</h2>
              <p className="text-2xl font-bold text-white/90">290 ₽</p>
              <p className="text-xs text-white/45">в месяц</p>
            </div>
            {isPremium && (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                Активен
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            <FeatureRow included text="Полная анкета" />
            <FeatureRow included text="Безлимитные отклики" />
            <FeatureRow included text="Стандартное место в каталоге" />
            <FeatureRow included text="Безлимитные отклики" />
            <FeatureRow included text="Бейдж «Premium»" />
            <FeatureRow included text="Выделение анкеты цветом в каталоге" />
            <FeatureRow included text="Статистика просмотров профиля" />
            <FeatureRow included text="Разовый буст анкеты в подарок" />
          </div>

          {!isPremium && (
            <button
              type="button"
              disabled={paying}
              onClick={() => void handleCheckout('premium')}
              className="mt-5 w-full rounded-[12px] bg-emerald-500 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying ? 'Перенаправляем…' : 'Подключить Premium — 290 ₽/мес'}
            </button>
          )}
        </section>
      </div>

      {/* What each feature means */}
      <section className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-white/90">Что даёт Premium</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-emerald-500/15">
              <Check className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Безлимитные отклики</p>
              <p className="mt-0.5 text-xs text-white/50">
                На бесплатном тарифе — только 5 откликов в месяц. Premium снимает это ограничение.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-amber-500/15">
              <Crown className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Бейдж Premium</p>
              <p className="mt-0.5 text-xs text-white/50">
                Выделяет вашу анкету среди других — работодатели замечают вас первыми.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-sky-500/15">
              <TrendingUp className="h-4 w-4 text-sky-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Выделение в каталоге</p>
              <p className="mt-0.5 text-xs text-white/50">
                Ваша анкета отображается с цветной рамкой в поиске работодателей.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-purple-500/15">
              <Eye className="h-4 w-4 text-purple-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Статистика просмотров</p>
              <p className="mt-0.5 text-xs text-white/50">
                Видите сколько раз работодатели просмотрели вашу анкету за последние 30 дней.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-rose-500/15">
              <Zap className="h-4 w-4 text-rose-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Буст анкеты в подарок</p>
              <p className="mt-0.5 text-xs text-white/50">
                При активации Premium получаете разовый буст — анкета поднимается в топ на 3 дня.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-teal-500/15">
              <MessageCircle className="h-4 w-4 text-teal-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Приоритетная поддержка</p>
              <p className="mt-0.5 text-xs text-white/50">
                Ваши обращения обрабатываются в первую очередь.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-5">
        <h2 className="mb-3 text-[15px] font-semibold text-white/90">Частые вопросы</h2>
        <div className="space-y-3 text-sm text-white/65">
          <p>
            <span className="font-medium text-white/85">Когда активируется подписка?</span>{' '}
            Сразу после подтверждения оплаты — обычно в течение 1–2 минут.
          </p>
          <p>
            <span className="font-medium text-white/85">Как отменить?</span>{' '}
            Подписка действует 1 месяц и не продлевается автоматически. Для продления нужно оплатить снова.
          </p>
          <p>
            <span className="font-medium text-white/85">Вопросы по оплате?</span>{' '}
            Пишите на{' '}
            <a href="mailto:support@unity.ru" className="text-emerald-300 hover:underline">
              support@unity.ru
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
