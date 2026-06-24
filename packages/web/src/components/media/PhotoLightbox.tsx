'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media/url';

interface PhotoLightboxProps {
  /** Полный URL фото для показа в увеличенном виде (может быть относительным). */
  src?: string | null;
  alt?: string;
  /** Кликабельная превью (например, аватар). */
  children: ReactNode;
  /** Класс для обёртки-кнопки. */
  className?: string;
  /** Отключить открытие (например, когда фото нет). */
  disabled?: boolean;
}

/**
 * Оборачивает любую превью фото: по клику открывает увеличенную версию
 * во весь экран (как в мессенджерах). Esc / клик по фону / крестик закрывают.
 * Работает и на публичном сайте, и в личных кабинетах.
 */
export function PhotoLightbox({ src, alt = '', children, className, disabled }: PhotoLightboxProps) {
  const [open, setOpen] = useState(false);
  const fullSrc = resolveMediaUrl(src);
  const canOpen = !disabled && !!fullSrc;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => canOpen && setOpen(true)}
        className={className}
        aria-label={canOpen ? 'Открыть фото' : undefined}
        style={canOpen ? { cursor: 'zoom-in' } : undefined}
        tabIndex={canOpen ? 0 : -1}
      >
        {children}
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-6 w-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fullSrc ?? undefined}
                alt={alt}
                className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
