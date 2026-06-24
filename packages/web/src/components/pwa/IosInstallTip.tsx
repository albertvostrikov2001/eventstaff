'use client';

import { useEffect, useState } from 'react';
import { Share, Plus, X } from 'lucide-react';

const STORAGE_KEY = 'unity:ios-install-tip';
// Через сколько снова показать после «Напомнить позже» (7 дней).
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIPhoneIPad = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ маскируется под Mac — ловим по тач-точкам.
  const isIPadOS =
    navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
  return isIPhoneIPad || isIPadOS;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Совет для пользователей Apple-устройств: добавить иконку Юнити на экран
 * «Домой». Показывается в личном кабинете после регистрации (один раз,
 * с возможностью «Напомнить позже»). Не показывается, если сайт уже открыт
 * как установленное приложение.
 */
export function IosInstallTip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAppleMobile() || isStandalone()) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ts = Number(raw);
        if (Number.isFinite(ts) && Date.now() - ts < SNOOZE_MS) return;
      }
    } catch {
      /* localStorage недоступен — просто покажем подсказку */
    }
    // Небольшая задержка, чтобы не перекрывать первый рендер кабинета.
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* no-op */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[150] flex justify-center px-3 pb-3 sm:pb-5">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0f211a] shadow-2xl">
        <div className="relative p-5">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>

          <h3 className="pr-6 text-lg font-semibold leading-snug text-white">
            Установите быстрый доступ к Юнити и получайте уведомления
          </h3>

          <ol className="mt-4 space-y-3 text-sm text-white/75">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--u-emerald,#2d6a4a)] text-[11px] font-bold text-white">
                1
              </span>
              <span>
                Нажмите на иконку{' '}
                <Share className="mx-0.5 inline h-4 w-4 -translate-y-px text-white" aria-label="Поделиться" />{' '}
                «Поделиться» внизу в Safari.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--u-emerald,#2d6a4a)] text-[11px] font-bold text-white">
                2
              </span>
              <span>
                Выберите{' '}
                <span className="inline-flex items-center gap-1 font-medium text-white">
                  «На экран „Домой“»
                  <Plus className="h-3.5 w-3.5" />
                </span>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--u-emerald,#2d6a4a)] text-[11px] font-bold text-white">
                3
              </span>
              <span>
                Нажмите <span className="font-medium text-white">«Добавить»</span>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--u-emerald,#2d6a4a)] text-[11px] font-bold text-white">
                4
              </span>
              <span>
                Готово! Иконка Юнити появится на рабочем столе телефона — заходить
                можно в один тап.
              </span>
            </li>
          </ol>

          <button
            type="button"
            onClick={dismiss}
            className="mt-5 w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Напомнить позже
          </button>
        </div>
      </div>
    </div>
  );
}
