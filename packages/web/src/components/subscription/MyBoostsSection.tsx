'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, X } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';

interface MyBoost {
  id: string;
  sku: string;
  label: string;
  needsVacancy: boolean;
  createdAt: string;
}

interface PickVacancy {
  id: string;
  title: string;
}

/**
 * Раздел «Мои бусты»: купленные, но не активированные бусты.
 * Пользователь активирует их вручную; для бустов работодателя,
 * привязанных к вакансии, при активации открывается выбор вакансии.
 */
export function MyBoostsSection({ audience }: { audience: 'worker' | 'employer' }) {
  const { toast } = useToast();
  const [boosts, setBoosts] = useState<MyBoost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [pickFor, setPickFor] = useState<MyBoost | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: MyBoost[] }>(`/subscriptions/${audience}/boosts`);
      setBoosts(res.data ?? []);
    } catch {
      // тихо — раздел просто не покажется
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    void load();
  }, [load]);

  const activate = useCallback(
    async (boost: MyBoost, vacancyId?: string) => {
      setActivating(boost.id);
      try {
        await apiClient.post(`/subscriptions/${audience}/boosts/${boost.id}/activate`, vacancyId ? { vacancyId } : {});
        toast(`«${boost.label}» активирован 🚀`, 'success');
        setPickFor(null);
        await load();
      } catch (err) {
        toast(err instanceof ApiError ? err.message : 'Не удалось активировать буст', 'error');
      } finally {
        setActivating(null);
      }
    },
    [audience, load, toast],
  );

  // Раздел не показываем, пока грузится или если бустов нет.
  if (loading || boosts.length === 0) return null;

  return (
    <div className="mt-6 rounded-[18px] border border-amber-400/30 bg-amber-400/[0.06] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-5 w-5 text-amber-300" />
        <h3 className="text-base font-semibold text-white">Мои бусты ({boosts.length})</h3>
      </div>
      <p className="mb-4 text-sm text-white/55">
        Купленные бусты. Активируйте, когда нужно — они начнут действовать с момента активации.
      </p>
      <div className="space-y-2">
        {boosts.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-4 py-3"
          >
            <span className="text-sm font-medium text-white/85">{b.label}</span>
            <button
              type="button"
              disabled={activating === b.id}
              onClick={() => (b.needsVacancy ? setPickFor(b) : void activate(b))}
              className="shrink-0 rounded-[9px] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: 'var(--u-gradient-primary, linear-gradient(135deg,#2d6a4a,#4fa76e))' }}
            >
              {activating === b.id ? 'Активируем…' : 'Активировать'}
            </button>
          </div>
        ))}
      </div>

      {pickFor && (
        <VacancyPicker
          boost={pickFor}
          submitting={activating === pickFor.id}
          onPick={(vacancyId) => void activate(pickFor, vacancyId)}
          onClose={() => setPickFor(null)}
        />
      )}
    </div>
  );
}

function VacancyPicker({
  boost,
  onPick,
  onClose,
  submitting,
}: {
  boost: MyBoost;
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
        <h3 className="mb-1 text-lg font-semibold text-white">{boost.label}</h3>
        <p className="mb-4 text-sm text-white/60">Выберите вакансию, к которой применить:</p>

        {loading ? (
          <p className="text-sm text-white/50">Загрузка вакансий…</p>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : vacancies.length === 0 ? (
          <div className="text-sm text-white/60">
            <p>У вас пока нет вакансий.</p>
            <Link href="/employer/vacancies/new" className="mt-2 inline-block font-medium text-emerald-300 underline">
              Создать вакансию →
            </Link>
          </div>
        ) : (
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {vacancies.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelected(v.id)}
                className="block w-full rounded-[10px] px-3 py-2.5 text-left text-sm transition"
                style={
                  selected === v.id
                    ? { background: 'rgba(45,106,74,0.35)', border: '1px solid rgba(79,167,110,0.6)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }
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
            {submitting ? 'Активируем…' : 'Активировать'}
          </button>
        )}
      </div>
    </div>
  );
}
