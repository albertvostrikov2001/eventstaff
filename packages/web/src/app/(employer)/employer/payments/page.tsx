'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { CreditCard, ExternalLink } from 'lucide-react';
import { ResponsiveTable, type Column } from '@/components/ui/ResponsiveTable';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button } from '@/components/ui/button';

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
  const [paymentsUnavailable, setPaymentsUnavailable] = useState(false);

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

  const pay = useCallback(
    async (shiftId: string) => {
      setPaying(shiftId);
      try {
        const res = await apiClient.post<{ data: { paymentUrl: string } }>('/payments/create', { shiftId });
        window.location.href = res.data.paymentUrl;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'PAYMENTS_UNAVAILABLE') {
          setPaymentsUnavailable(true);
        }
        toast(e instanceof ApiError ? e.message : 'Ошибка оплаты', 'error');
      } finally {
        setPaying(null);
      }
    },
    [toast],
  );

  const columns = useMemo((): Column<ShiftRow>[] => {
    return [
      {
        key: 'when',
        header: 'Смена',
        render: (s, _i) => (
          <span className="whitespace-nowrap text-xs text-white/70">
            {s.completedAt ? new Date(s.completedAt).toLocaleString('ru-RU') : '—'}
          </span>
        ),
      },
      {
        key: 'worker',
        header: 'Исполнитель',
        render: (s, _i) => (
          <span>
            {s.booking.worker.firstName} {s.booking.worker.lastName}
          </span>
        ),
      },
      {
        key: 'shiftSt',
        header: 'Статус смены',
        render: (s, _i) => <span className="text-sm">{shiftStatusLabel(s.status)}</span>,
      },
      {
        key: 'amount',
        header: 'Сумма',
        render: (s, _i) => {
          const p = s.payments[0];
          return (
            <span>
              {p
                ? `${p.amount.toLocaleString('ru-RU')} ₽`
                : s.booking.rate
                  ? `${Number(s.booking.rate).toLocaleString('ru-RU')} ₽`
                  : '—'}
            </span>
          );
        },
      },
      {
        key: 'pay',
        header: 'Оплата',
        className: 'text-right',
        render: (s, _i) => {
          const p = s.payments[0];
          const canPay = !p || p.status === 'FAILED';
          return (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {p?.status === 'COMPLETED' && <span className="text-emerald-300">{payLabel(p.status)}</span>}
              {p && p.status !== 'COMPLETED' && p.status !== 'PROCESSING' && (
                <span className="text-amber-200/90">{payLabel(p.status)}</span>
              )}
              {canPay && s.status === 'COMPLETED' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!!paying}
                  isLoading={paying === s.id}
                  onClick={() => void pay(s.id)}
                  leftIcon={paying === s.id ? undefined : <CreditCard className="h-3.5 w-3.5" />}
                  className="rounded-input px-2.5 py-1 text-xs"
                >
                  Оплатить
                </Button>
              )}
              {p?.status === 'PROCESSING' && (
                <>
                  <span className="text-amber-200/90">{payLabel(p.status)}</span>
                  <a
                    className="inline-flex items-center gap-1 text-xs text-primary-300 underline"
                    href="https://yookassa.ru"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    YooKassa
                  </a>
                </>
              )}
            </div>
          );
        },
      },
    ];
  }, [pay, paying]);

  const mobileCard = useMemo(
    () => ({
      title: (s: ShiftRow) => (
        <span>
          {s.booking.worker.firstName} {s.booking.worker.lastName}
        </span>
      ),
      subtitle: (s: ShiftRow) => (
        <span>
          {s.completedAt ? new Date(s.completedAt).toLocaleString('ru-RU') : '—'} · {shiftStatusLabel(s.status)}
        </span>
      ),
      meta: (s: ShiftRow) => {
        const p = s.payments[0];
        const amt = p
          ? `${p.amount.toLocaleString('ru-RU')} ₽`
          : s.booking.rate
            ? `${Number(s.booking.rate).toLocaleString('ru-RU')} ₽`
            : '—';
        return <span>Оплата: {p ? payLabel(p.status) : '—'} · {amt}</span>;
      },
      actions: (s: ShiftRow) => {
        const p = s.payments[0];
        const canPay = !p || p.status === 'FAILED';
        return (
          <div className="flex w-full flex-wrap gap-2">
            {canPay && s.status === 'COMPLETED' ? (
              <Button
                type="button"
                variant="primary"
                disabled={!!paying}
                isLoading={paying === s.id}
                onClick={() => void pay(s.id)}
                leftIcon={paying === s.id ? undefined : <CreditCard className="h-4 w-4" />}
                className="inline-flex min-w-0 flex-1 justify-center rounded-input px-3 py-2 text-sm"
              >
                Оплатить
              </Button>
            ) : null}
            {p?.status === 'PROCESSING' ? (
              <a
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-input border border-white/15 px-3 py-2 text-sm text-primary-200"
                href="https://yookassa.ru"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                YooKassa
              </a>
            ) : null}
          </div>
        );
      },
    }),
    [pay, paying],
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Кабинет', href: '/employer/dashboard' }, { label: 'Оплата' }]} />

      <div>
        <h1 className="text-2xl font-bold text-white">Оплата смен</h1>
        <p className="mt-1 text-sm text-white/60">Завершённые смены, готовые к оплате через YooKassa</p>
      </div>

      {paymentsUnavailable ? (
        <div className="rounded-input border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-white/65">
          Оплата временно недоступна. Мы работаем над подключением платёжной системы.
        </div>
      ) : null}

      <ResponsiveTable
        data={rows}
        columns={columns}
        mobileCard={mobileCard}
        keyExtractor={(s) => s.id}
        isLoading={loading}
        variant="dark"
        emptyState={
          !loading && rows.length === 0 ? (
            <div className="rounded-input border border-white/10 bg-white/[0.04] px-4 py-10 text-center text-white/60">
              <p className="text-white/80">У вас ещё не было смен, готовых к оплате</p>
              <p className="mt-1 text-sm">Завершите смену с подтверждением обеих сторон — она появится здесь</p>
            </div>
          ) : null
        }
      />
    </div>
  );
}
