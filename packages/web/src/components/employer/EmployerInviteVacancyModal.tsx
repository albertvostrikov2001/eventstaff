'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';

interface VacOpt {
  id: string;
  title: string;
}

export function EmployerInviteVacancyModal({
  workerId,
  workerName,
  open,
  onClose,
  onSent,
}: {
  workerId: string;
  workerName: string;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<VacOpt[]>([]);
  const [vacancyId, setVacancyId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void apiClient
      .get<{ data: VacOpt[] }>('/employer/vacancies', { page: 1, perPage: 100 })
      .then((r) => setVacancies(r.data ?? []))
      .catch(() => setVacancies([]));
    setVacancyId('');
  }, [open]);

  const sendInvite = async () => {
    if (!vacancyId) {
      toast('Выберите вакансию', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiClient.post('/employer/invite', { workerId, vacancyId });
      toast('Приглашение отправлено', 'success');
      onSent?.();
      onClose();
    } catch {
      toast('Не удалось отправить приглашение', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-8 left-[50%] z-[101] max-h-[min(90vh,520px)] w-[calc(100%-2rem)] max-w-md translate-x-[-50%] overflow-y-auto rounded-[18px] border border-white/[0.1] bg-[#101f18] p-5 text-white shadow-2xl sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold tracking-tight">Пригласить</Dialog.Title>
            <Dialog.Close
              className="rounded-lg p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-4 text-sm text-white/65">
            Кого: <strong className="text-white">{workerName}</strong>
          </Dialog.Description>

          <label className="mb-4 block">
            <span className="mb-2 block text-xs font-medium text-white/50">Вакансия</span>
            <select
              value={vacancyId}
              onChange={(e) => setVacancyId(e.target.value)}
              className="w-full rounded-[12px] border border-white/[0.1] bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
            >
              <option value="">Выберите…</option>
              {vacancies.map((v) => (
                <option key={v.id} value={v.id} className="text-gray-900">
                  {v.title}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={() => void sendInvite()}
            className="flex w-full items-center justify-center rounded-[12px] bg-gradient-to-r from-emerald-600 to-teal-500 py-3 text-sm font-semibold shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            {busy ? 'Отправляем…' : 'Отправить приглашение'}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
