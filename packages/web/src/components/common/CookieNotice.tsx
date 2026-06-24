'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'unity-cookie-consent';

/**
 * Thin site-themed cookie notice bar pinned to the bottom of the viewport.
 * Shows once until the visitor accepts (stored in localStorage).
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable — skip the notice rather than break the page.
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Уведомление об использовании cookies"
      className="fixed inset-x-0 bottom-0 z-[120]"
      style={{
        background: 'rgba(8, 18, 14, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--u-border, rgba(255,255,255,0.08))',
      }}
    >
      <div className="container-page flex flex-col items-center gap-2.5 py-2.5 sm:flex-row sm:gap-4 sm:py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Cookie className="h-4 w-4 shrink-0 text-[var(--accent,#5bb880)]" aria-hidden="true" />
          <p className="text-[12.5px] leading-snug text-white/65">
            Мы используем cookies, чтобы сайт работал корректно и удобно. Оставаясь на сайте, вы соглашаетесь с{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[var(--accent,#5bb880)] underline-offset-2 hover:underline"
            >
              политикой конфиденциальности
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-[var(--accent,#5bb880)] px-4 py-1.5 text-[12.5px] font-semibold text-[#08120e] transition hover:opacity-90"
          >
            Принять
          </button>
          <button
            type="button"
            onClick={accept}
            aria-label="Закрыть"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.08] hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
