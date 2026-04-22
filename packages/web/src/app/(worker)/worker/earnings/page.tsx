'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Loader2, Wallet } from 'lucide-react';

type Pay = {
  id: string;
  status: string;
  amount: number;
  paidAt: string | null;
  shift: {
    id: string;
    completedAt: string | null;
    booking: { date: string; location: string | null };
  };
};

function payLabel(s: string): string {
  switch (s) {
    case 'PENDING':
      return 'Ожидает оплаты';
    case 'PROCESSING':
      return 'В обработке';
    case 'COMPLETED':
      return 'Оплачено';
    case 'FAILED':
      return 'Ошибка';
    default:
      return s;
  }
}

export default function WorkerEarningsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Pay[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get<{ data: Pay[] }>('/payments/history')
      .then((r) => setRows(r.data))
      .catch(() => toast('Не удалось загрузить', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Заработок</h1>
        <p className="mt-1 text-sm text-white/60">Смены и статус оплаты</p>
      </div>

      <div className="overflow-x-auto rounded-input border border-white/10 bg-white/[0.04]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs font-medium uppercase text-white/50">
              <th className="px-3 py-2">Смена</th>
              <th className="px-3 py-2">Сумма</th>
              <th className="px-3 py-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-white/50">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка
                  </span>
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-white/50">
                  <div className="mx-auto max-w-sm">
                    <Wallet className="mx-auto h-10 w-10 text-white/20" />
                    <p className="mt-3 text-white/80">Пока нет оплат</p>
                    <p className="mt-1 text-sm text-white/50">
                      После завершения смены и оплаты работодателем вы увидите её здесь
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.05] text-white/90">
                  <td className="px-3 py-2">
                    <div className="text-xs text-white/60">
                      {p.shift?.completedAt
                        ? new Date(p.shift.completedAt).toLocaleString('ru-RU')
                        : new Date(p.shift.booking.date).toLocaleDateString('ru-RU')}
                    </div>
                    {p.shift?.booking?.location && (
                      <div className="text-xs text-white/40">{p.shift.booking.location}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{p.amount.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-3 py-2 text-emerald-200/90">{payLabel(p.status)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
