import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  /** dark — кабинет на тёмном фоне; light — светлые области (например шапка чата) */
  tone?: 'dark' | 'light';
}

export function Breadcrumbs({ items, className = '', tone = 'dark' }: BreadcrumbsProps) {
  const isLight = tone === 'light';

  const sepClass = isLight ? 'text-gray-300' : 'text-white/35';
  const linkClass = isLight
    ? 'text-gray-500 transition-colors duration-150 ease-in-out hover:text-gray-800 no-underline'
    : 'text-[rgba(255,255,255,0.45)] transition-colors duration-150 ease-in-out hover:text-[rgba(255,255,255,0.8)] no-underline';
  const lastClass = isLight
    ? 'max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap font-medium text-gray-800 sm:text-sm'
    : 'max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap font-medium text-[rgba(255,255,255,0.75)] sm:text-sm';

  return (
    <nav
      aria-label="Breadcrumb"
      className={`mb-4 flex flex-wrap items-center gap-1 text-sm max-sm:text-[0.8125rem] ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex max-w-full items-center gap-0.5">
            {i > 0 && (
              <ChevronRight className={`h-[13px] w-[13px] shrink-0 ${sepClass}`} aria-hidden />
            )}
            {isLast || !item.href ? (
              <span className={lastClass}>{item.label}</span>
            ) : (
              <Link href={item.href} className={linkClass}>
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
