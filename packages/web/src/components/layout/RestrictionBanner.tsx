'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AlertTriangle } from 'lucide-react';

export function RestrictionBanner() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    void apiClient
      .get<{ data: { isRestricted?: boolean; restrictedReason?: string | null } }>('/reliability/me')
      .then((r) => {
        if (r.data.isRestricted) {
          setMsg(
            r.data.restrictedReason ||
              'Ваш аккаунт ограничен. Обратитесь в поддержку.',
          );
        }
      })
      .catch(() => {});
  }, []);
  if (!msg) return null;
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-input border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-100"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
      <p>
        <span className="font-semibold">Аккаунт ограничен. </span>
        {msg}
      </p>
    </div>
  );
}
