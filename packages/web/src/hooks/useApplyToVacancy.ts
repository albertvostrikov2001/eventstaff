'use client';

import { useCallback, useState } from 'react';
import { ApiError, apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';

export type ScheduleConflictDetail = {
  date: string;
  shiftId: string;
  vacancyTitle: string | null;
  status: string;
};

function extractConflicts(err: ApiError): ScheduleConflictDetail[] {
  const payload = err.details as Record<string, unknown> | undefined;
  if (!payload) return [];
  const inner = payload.details as { conflicts?: ScheduleConflictDetail[] } | undefined;
  return inner?.conflicts ?? (payload.conflicts as ScheduleConflictDetail[] | undefined) ?? [];
}

export function useApplyToVacancy() {
  const { toast } = useToast();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [pendingConflict, setPendingConflict] = useState<{
    vacancyId: string;
    message: string;
    conflicts: ScheduleConflictDetail[];
  } | null>(null);

  const submit = useCallback(
    async (vacancyId: string, acknowledgeConflict = false) => {
      setApplyingId(vacancyId);
      try {
        await apiClient.post('/worker/applications', { vacancyId, acknowledgeConflict });
        toast('Отклик отправлен', 'success');
        setPendingConflict(null);
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'SCHEDULE_CONFLICT' && !acknowledgeConflict) {
          const conflicts = extractConflicts(e);
          if (conflicts.length > 0) {
            setPendingConflict({ vacancyId, message: e.message, conflicts });
            return false;
          }
        }
        const msg = e instanceof ApiError ? e.message : 'Не удалось отправить отклик';
        toast(msg, 'error');
        return false;
      } finally {
        setApplyingId(null);
      }
    },
    [toast],
  );

  const confirmConflict = useCallback(async () => {
    if (!pendingConflict) return false;
    return submit(pendingConflict.vacancyId, true);
  }, [pendingConflict, submit]);

  const dismissConflict = useCallback(() => setPendingConflict(null), []);

  return { applyingId, pendingConflict, submit, confirmConflict, dismissConflict };
}

export function useInvitationRespond() {
  const { toast } = useToast();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [pendingConflict, setPendingConflict] = useState<{
    invitationId: string;
    message: string;
    conflicts: ScheduleConflictDetail[];
  } | null>(null);

  const accept = useCallback(
    async (invitationId: string, acknowledgeConflict = false) => {
      setAcceptingId(invitationId);
      try {
        await apiClient.patch(`/worker/applications/${invitationId}/respond`, {
          action: 'ACCEPT',
          acknowledgeConflict,
        });
        toast('Приглашение принято. Работодатель получит уведомление.', 'success');
        setPendingConflict(null);
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'SCHEDULE_CONFLICT' && !acknowledgeConflict) {
          const conflicts = extractConflicts(e);
          if (conflicts.length > 0) {
            setPendingConflict({ invitationId, message: e.message, conflicts });
            return false;
          }
        }
        toast(e instanceof ApiError ? e.message : 'Ошибка. Попробуйте ещё раз.', 'error');
        return false;
      } finally {
        setAcceptingId(null);
      }
    },
    [toast],
  );

  const confirmConflict = useCallback(async () => {
    if (!pendingConflict) return false;
    return accept(pendingConflict.invitationId, true);
  }, [pendingConflict, accept]);

  const dismissConflict = useCallback(() => setPendingConflict(null), []);

  return { acceptingId, pendingConflict, accept, confirmConflict, dismissConflict };
}
