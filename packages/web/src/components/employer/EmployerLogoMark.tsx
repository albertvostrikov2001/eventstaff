'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const SZ = {
  sm: 'h-10 w-10 text-sm rounded-lg',
  md: 'h-12 w-12 text-base rounded-xl',
  lg: 'h-16 w-16 text-xl rounded-xl',
  xl: 'h-20 w-20 text-2xl rounded-xl',
  xxl: 'h-[120px] w-[120px] text-3xl rounded-xl',
} as const;

function initialsFromCompany(companyName?: string | null, contactName?: string | null): string {
  const raw = (companyName ?? contactName ?? 'Работодатель').trim();
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'Р';
  return parts.map((w) => w[0]?.toUpperCase() ?? '').join('') || 'Р';
}

export function EmployerLogoMark(props: {
  logoUrl?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  alt?: string;
  size?: keyof typeof SZ;
  className?: string;
  roundedClassName?: string;
}) {
  const {
    logoUrl,
    companyName,
    contactName,
    alt,
    size = 'md',
    className,
    roundedClassName = 'rounded-xl',
  } = props;
  const initials = initialsFromCompany(companyName, contactName);
  const [broken, setBroken] = useState(false);
  const showImg = logoUrl && !broken;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden font-semibold text-white',
        SZ[size],
        roundedClassName,
        className,
      )}
      style={{
        backgroundColor: 'var(--color-emerald, var(--u-emerald, #2d6a4a))',
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={alt ?? initials}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </div>
  );
}
