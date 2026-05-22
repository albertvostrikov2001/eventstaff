'use client';

import { useEffect, useState } from 'react';
import { getPublicApiBase } from '@/lib/api/publicApiBase';

export function useNotificationUnreadCount(enabled = true): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const base = getPublicApiBase();
    if (!base) return;

    const load = () => {
      void fetch(`${base}/notifications/unread-count`, { credentials: 'include', cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (typeof j?.data?.count === 'number') setCount(j.data.count);
        })
        .catch(() => {});
    };

    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [enabled]);

  return count;
}
