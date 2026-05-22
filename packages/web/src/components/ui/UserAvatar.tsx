'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/media/url';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const sizePx: Record<32 | 48 | 64 | 80, number> = {
  32: 32,
  48: 48,
  64: 64,
  80: 80,
};

export interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: 32 | 48 | 64 | 80;
  className?: string;
}

export function UserAvatar({ src, name, size = 48, className }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const wh = sizePx[size];
  const displaySrc = resolveMediaUrl(src);
  if (displaySrc && !imgError) {
    return (
      <Image
        src={displaySrc}
        alt={`Фото ${name}`}
        width={wh}
        height={wh}
        className={cn('rounded-full object-cover', className)}
        sizes={`${wh}px`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-emerald-600 font-semibold text-white',
        className,
      )}
      style={{
        width: wh,
        height: wh,
        fontSize: size <= 32 ? '0.65rem' : size <= 48 ? '0.875rem' : '1rem',
      }}
    >
      {getInitials(name)}
    </div>
  );
}
