'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';

type ShiftPayStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
type ShiftStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DISPUTED';

type ShiftRow = {
  id: string;
  status: ShiftStatus;
  completedAt: string | null;
  booking: {
    date: string;
    rate: string | null;
    worker: { firstName: string; lastName: string; id: string };
  };
  payments: {
    id: string;
    status: ShiftPayStatus;
    amount: number;
    providerPaymentId: string | null;
  }[];
};

function payLabel(s: ShiftPayStatus | undefined): string {
  switch (s) {
    case 'PENDING':
      return 'Ожидает оплаты';
    case 'PROCESSING':
      return 'В обработке';
    case 'COMPLETED':
      return 'Оплачено';
    case 'FAILED':
      return 'Ошибка';
    case 'REFUNDED':
      return 'Возврат';
    default:
      return 'Ожидает оплаты';
  }
}

function shiftStatusLabel(s: ShiftStatus): string {
  const map: Record<ShiftStatus, string> = {
    PENDING: 'Ожидает начала',
    ACTIVE: 'Идёт сейчас',
    COMPLETED: 'Успешно завершена',
    FAILED: 'Не была выполнена',
    CANCELLED: 'Отменена',
    DISPUTED: 'Спор',
  };
  return map[s] ?? s;
}

export default function EmployerPaymentsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get<{ data: ShiftRow[] }>('/employer/shifts-for-payment')
      .then((r) => setRows(r.data))
      .catch(() => toast('Не удалось загрузить смены', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const pay = async (shiftId: string) => {
    setPaying(shiftId);
    try {
      const res = await apiClient.post<{ data: { paymentUrl: string } }>('/payments/create', { shiftId });
      window.location.href = res.data.paymentUrl;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Ошибка оплаты', 'error');
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Оплата смен</h1>
        <p className="mt-1 text-sm text-white/60">
          Завершённые смены, готовые к оплате через YooKassa
        </p>
      </div>

      <div className="overflow-x-auto rounded-input border border-white/10 bg-white/[0.04]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs font-medium uppercase text-white/50">
              <th className="px-3 py-2">Смена</th>
              <th className="px-3 py-2">Исполнитель</th>
              <th className="px-3 py-2">Статус смены</th>
              <th className="px-3 py-2">Сумма</th>
              <th className="px-3 py-2">Оплата</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-white/50">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка
                  </span>
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-white/50">
                  <p className="text-white/80">У вас ещё не было смен, готовых к оплате</p>
                  <p className="mt-1 text-sm">Завершите смену с подтверждением обеих сторон — она появится здесь</p>
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((s) => {
                const p = s.payments[0];
                const canPay = !p || p.status === 'FAILED';
                return (
                  <tr key={s.id} className="border-b border-white/[0.05] text-white/90">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-white/70">
                      {s.completedAt
                        ? new Date(s.completedAt).toLocaleString('ru-RU')
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {s.booking.worker.firstName} {s.booking.worker.lastName}
                    </td>
                    <td className="px-3 py-2 text-sm">{shiftStatusLabel(s.status)}</td>
                    <td className="px-3 py-2">
                      {p
                        ? `${p.amount.toLocaleString('ru-RU')} ₽`
                        : s.booking.rate
                          ? `${Number(s.booking.rate).toLocaleString('ru-RU')} ₽`
                          : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {p?.status === 'COMPLETED' && (
                        <span className="text-emerald-300">{payLabel(p.status)}</span>
                      )}
                      {p && p.status !== 'COMPLETED' && (
                        <span className="text-amber-200/90">{payLabel(p.status)}</span>
                      )}
                      {canPay && s.status === 'COMPLETED' && (
                        <button
                          type="button"
                          disabled={!!paying}
                          onClick={() => void pay(s.id)}
                          className="ml-2 inline-flex items-center gap-1 rounded-input bg-primary-500/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                        >
                          {paying === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="h-3.5 w-3.5" />
                          )}
                          Оплатить
                        </button>
                      )}
                      {p?.status === 'PROCESSING' && (
                        <a
                          className="ml-2 inline-flex items-center gap-1 text-xs text-primary-300 underline"
                          href="https://yookassa.ru"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          YooKassa
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
