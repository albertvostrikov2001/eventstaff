'use client';

import { useEffect, useState } from 'react';
import { BarChart2, Users, Send, TrendingUp, MapPin, Clock, Lock, ChevronRight, RefreshCw } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayCount {
  date: string;
  count: number;
}

interface TopVacancy {
  id: string;
  title: string;
  responsesCount: number;
}

interface GeoEntry {
  city: string;
  count: number;
}

interface AnalyticsData {
  plan: string;
  period: { from: string; to: string };
  vacancies: { total: number; active: number; archived: number; paused: number };
  responses: { total: number; thisMonth: number; byDay: DayCount[] };
  topVacancies: TopVacancy[];
  invitations: { sent: number; accepted: number; conversionRate: number };
  advanced?: {
    geography: GeoEntry[];
    avgTimeToFirstResponse: number | null;
  };
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}

function KpiCard({ label, value, sub, icon, accent = 'text-primary-400' }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
          <p className={`mt-1.5 text-3xl font-bold ${accent}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{sub}</p>}
        </div>
        <div className={`mt-0.5 ${accent} opacity-60`}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Bar Chart (SVG) ──────────────────────────────────────────────────────────

function ResponsesChart({ byDay }: { byDay: DayCount[] }) {
  if (!byDay.length) return null;

  const maxCount = Math.max(...byDay.map((d) => d.count), 1);
  const chartH = 80;
  const barW = Math.max(4, Math.floor(480 / byDay.length) - 2);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
        Отклики за последние 30 дней
      </h3>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${byDay.length * (barW + 2)} ${chartH + 24}`}
          className="w-full"
          style={{ minWidth: '320px' }}
          aria-label="Отклики по дням"
        >
          {byDay.map((d, i) => {
            const h = Math.max(2, Math.round((d.count / maxCount) * chartH));
            const x = i * (barW + 2);
            const y = chartH - h;
            const showLabel = i === 0 || i === byDay.length - 1 || i % 7 === 0;
            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={2}
                  className={d.count > 0 ? 'fill-primary-500' : 'fill-white/10'}
                >
                  <title>{d.date}: {d.count}</title>
                </rect>
                {showLabel && (
                  <text
                    x={x + barW / 2}
                    y={chartH + 16}
                    textAnchor="middle"
                    fontSize={8}
                    className="fill-[var(--text-muted)]"
                  >
                    {d.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    setUpgradeRequired(false);
    try {
      const res = await apiClient.get<{ data: AnalyticsData }>('/employer/analytics');
      setData(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setUpgradeRequired(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Upgrade prompt ───────────────────────────────────────────────────────
  if (!loading && upgradeRequired) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Аналитика</h1>
        <div className="rounded-2xl border border-primary-500/20 bg-primary-500/5 p-8 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-primary-400" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Аналитика доступна с тарифа Бизнес
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Отслеживайте эффективность вакансий, динамику откликов и конверсию приглашений. На тарифе Про — дополнительно: география соискателей и среднее время до первого отклика.
          </p>
          <a
            href="/employer/subscription"
            className="mt-5 inline-flex items-center gap-2 rounded-input bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Улучшить тариф
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Аналитика</h1>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-white/10 py-16 text-center">
          <p className="text-sm text-[var(--text-secondary)]">Не удалось загрузить данные</p>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-input bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <RefreshCw className="h-4 w-4" />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  if (!data) return null;

  const fromDate = new Date(data.period.from).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const toDate = new Date(data.period.to).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Аналитика</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Период: {fromDate} — {toDate}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-input border border-white/10 px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-white/[0.06]"
        >
          <RefreshCw className="h-4 w-4" />
          Обновить
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Всего вакансий"
          value={data.vacancies.total}
          sub={`${data.vacancies.active} активных`}
          icon={<BarChart2 className="h-6 w-6" />}
        />
        <KpiCard
          label="Откликов всего"
          value={data.responses.total}
          sub={`${data.responses.thisMonth} в этом месяце`}
          icon={<Users className="h-6 w-6" />}
          accent="text-emerald-400"
        />
        <KpiCard
          label="Приглашений"
          value={data.invitations.sent}
          sub={`${data.invitations.accepted} принято`}
          icon={<Send className="h-6 w-6" />}
          accent="text-sky-400"
        />
        <KpiCard
          label="Конверсия"
          value={`${data.invitations.conversionRate}%`}
          sub="принято / отправлено"
          icon={<TrendingUp className="h-6 w-6" />}
          accent="text-violet-400"
        />
      </div>

      {/* Vacancy status breakdown */}
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Статусы вакансий</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { label: 'Активные', value: data.vacancies.active, color: 'text-emerald-400' },
            { label: 'На паузе', value: data.vacancies.paused, color: 'text-amber-400' },
            { label: 'В архиве', value: data.vacancies.archived, color: 'text-[var(--text-muted)]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`text-xl font-bold ${color}`}>{value}</span>
              <span className="text-sm text-[var(--text-secondary)]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Responses chart */}
      <ResponsesChart byDay={data.responses.byDay} />

      {/* Top vacancies */}
      {data.topVacancies.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Топ вакансий по откликам
          </h3>
          <div className="space-y-2">
            {data.topVacancies.map((v, i) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3"
              >
                <span className="w-5 text-center text-sm font-bold text-[var(--text-muted)]">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
                  {v.title}
                </span>
                <span className="shrink-0 text-sm font-semibold text-primary-400">
                  {v.responsesCount} откл.
                </span>
                <a
                  href={`/employer/vacancies/${v.id}`}
                  className="shrink-0 text-xs text-[var(--text-muted)] transition hover:text-primary-400"
                >
                  Открыть
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced analytics (PRO / ENTERPRISE) */}
      {data.advanced ? (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Расширенная аналитика</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Geography */}
            {data.advanced.geography.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    География соискателей
                  </h3>
                </div>
                <div className="space-y-2">
                  {data.advanced.geography.map(({ city, count }) => {
                    const maxGeo = data.advanced!.geography[0].count;
                    const pct = Math.round((count / maxGeo) * 100);
                    return (
                      <div key={city} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate text-xs text-[var(--text-secondary)]">
                          {city}
                        </span>
                        <div className="flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-2 rounded-full bg-primary-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-xs font-medium text-[var(--text-primary)]">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Avg time to first response */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Среднее время до первого отклика
                </h3>
              </div>
              {data.advanced.avgTimeToFirstResponse !== null ? (
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-sky-400">
                    {data.advanced.avgTimeToFirstResponse}
                  </span>
                  <span className="mb-1 text-sm text-[var(--text-secondary)]">часов</span>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  Недостаточно данных
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Teaser for non-PRO paid users */
        data.plan !== 'free' && (
          <div className="rounded-xl border border-dashed border-violet-500/20 bg-violet-500/5 p-5">
            <div className="flex items-center gap-3">
              <BarChart2 className="h-5 w-5 shrink-0 text-violet-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Расширенная аналитика доступна на тарифе Про
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  География соискателей, среднее время до первого отклика и другие метрики
                </p>
              </div>
              <a
                href="/employer/subscription"
                className="shrink-0 rounded-input bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700"
              >
                Про тариф
              </a>
            </div>
          </div>
        )
      )}
    </div>
  );
}
