import Image from 'next/image';
import Link from 'next/link';
import { publicAssetUrl } from '@/lib/public-asset-url';

type LogoSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<LogoSize, number> = {
  sm: 28,
  md: 40,
  lg: 52,
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
  const imgSize = sizeMap[size];

  return (
    <Link
      href={href}
      className={`flex items-center gap-[10px] ${className}`}
      aria-label="Юнити — главная"
    >
      <Image
        src={publicAssetUrl('/logo.png')}
        alt="Юнити — платформа event-персонала"
        width={imgSize}
        height={imgSize}
        className="block shrink-0 object-contain"
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
