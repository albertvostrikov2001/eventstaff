'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

const POLL_INTERVAL_MS = 30_000;

/** Notification types that drive each cabinet nav section badge. */
export const WORKER_SECTION_TYPES: Record<string, string[]> = {
  '/worker/applications': ['APPLICATION_RESPONSE', 'CANCELLATION'],
  '/worker/invitations': ['INVITATION'],
  '/worker/shifts': ['SHIFT_REMINDER', 'SHIFT_COMPLETED'],
  '/worker/reviews': ['REVIEW_RECEIVED'],
};

export const EMPLOYER_SECTION_TYPES: Record<string, string[]> = {
  '/employer/applications': ['APPLICATION_RECEIVED'],
  '/employer/reviews': ['REVIEW_RECEIVED'],
  '/employer/shifts': ['SHIFT_REMINDER', 'SHIFT_COMPLETED'],
};

/**
 * Polls unread-notification counts grouped by type and maps them to nav sections.
 * On navigating into a section, marks that section's notification types read so the
 * badge clears. Used by the cabinet shells to render per-tab badges.
 */
export function useNavNotifications(sectionTypes: Record<string, string[]>) {
  const [byType, setByType] = useState<Record<string, number>>({});
  const pathname = usePathname();
  const markedFor = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await apiClient.get<{ data: { byType: Record<string, number> } }>(
        '/notifications/unread-summary',
      );
      setByType(r.data?.byType ?? {});
    } catch {
      // silent — not critical
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  // Mark the active section's notification types read (once per visit).
  useEffect(() => {
    const match = Object.keys(sectionTypes).find(
      (href) => pathname === href || pathname.startsWith(href + '/'),
    );
    if (!match) return;
    if (markedFor.current === pathname) return;
    const types = sectionTypes[match];
    const hasUnread = types.some((t) => (byType[t] ?? 0) > 0);
    if (!hasUnread) return;
    markedFor.current = pathname;
    apiClient
      .post('/notifications/read-by-types', { types })
      .then(() => refresh())
      .catch(() => {
        markedFor.current = null;
      });
  }, [pathname, byType, sectionTypes, refresh]);

  const sectionCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [href, types] of Object.entries(sectionTypes)) {
      out[href] = types.reduce((sum, t) => sum + (byType[t] ?? 0), 0);
    }
    return out;
  }, [byType, sectionTypes]);

  return { sectionCounts, byType, refresh };
}
