import Image from 'next/image';
import Link from 'next/link';
import { publicAssetUrl } from '@/lib/public-asset-url';

type LogoSize = 'sm' | 'md' | 'lg';

// Logo natural aspect ratio: 478 × 512 (≈ 0.934 w:h)
const sizeMap: Record<LogoSize, { w: number; h: number }> = {
  sm: { w: 26, h: 28 },
  md: { w: 37, h: 40 },
  lg: { w: 49, h: 52 },
};

const textSizeMap: Record<LogoSize, string> = {
  sm: '1rem',
  md: '1.125rem',
  lg: '1.375rem',
};

interface LogoProps {
  size?: LogoSize;
  showText?: boolean;
  href?: string;
  className?: string;
}

export function Logo({ size = 'md', showText = true, href = '/', className = '' }: LogoProps) {
  const { w, h } = sizeMap[size];

  return (
    <Link
      href={href}
      className={`flex items-center gap-[10px] ${className}`}
      aria-label="Юнити — главная"
    >
      <Image
        src={publicAssetUrl('/logo.png')}
        alt="Юнити — платформа event-персонала"
        width={w}
        height={h}
        className="block shrink-0"
        style={{ width: w, height: h, objectFit: 'contain' }}
        priority
      />
      {showText && (
        <span
          className="font-semibold text-white leading-none"
          style={{
            fontFamily: 'var(--font-display, var(--font-onest, "Onest", sans-serif))',
            fontSize: textSizeMap[size],
          }}
        >
          Юнити
        </span>
      )}
    </Link>
  );
}
