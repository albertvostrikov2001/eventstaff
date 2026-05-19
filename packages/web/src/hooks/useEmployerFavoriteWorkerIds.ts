'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { useAuthStore } from '@/stores/authStore';

export const EMPLOYER_FAVORITE_IDS_KEY = ['employerFavoriteWorkerIds'] as const;

export function useEmployerFavoriteWorkerIdsQuery(enabled: boolean) {
  return useQuery({
    queryKey: EMPLOYER_FAVORITE_IDS_KEY,
    enabled,
    queryFn: async (): Promise<string[]> => {
      const res = await apiClient.get<{ data: string[]; success?: boolean }>(
        '/employer/favorites/target-ids',
      );
      return res.data ?? [];
    },
  });
}

export function useToggleEmployerFavorite() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workerId, add }: { workerId: string; add: boolean }) => {
      if (add) {
        await apiClient.post<{ success?: boolean }>('/employer/favorites', { workerId });
      } else {
        await apiClient.delete<{ success?: boolean }>(`/employer/favorites/${workerId}`);
      }
    },
    onMutate: async ({ workerId, add }) => {
      await qc.cancelQueries({ queryKey: EMPLOYER_FAVORITE_IDS_KEY });
      const prev = qc.getQueryData<string[]>(EMPLOYER_FAVORITE_IDS_KEY);
      qc.setQueryData<string[]>(EMPLOYER_FAVORITE_IDS_KEY, (old) => {
        const base = [...(old ?? [])];
        if (add && !base.includes(workerId)) {
          base.unshift(workerId);
          return base;
        }
        if (!add) return base.filter((id) => id !== workerId);
        return base;
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(EMPLOYER_FAVORITE_IDS_KEY, ctx.prev);
      }
      toast('Не удалось обновить избранное', 'error');
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: EMPLOYER_FAVORITE_IDS_KEY }),
  });
}

export function useIsEmployerFavoritesLoaded() {
  const { user, isAuthenticated } = useAuthStore();
  const isEmployer = Boolean(isAuthenticated && user?.activeRole === 'employer');
  return isEmployer;
}
