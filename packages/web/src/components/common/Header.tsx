'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/vacancies', label: 'Вакансии' },
  { href: '/workers',   label: 'Специалисты' },
  { href: '/employers', label: 'Работодатели' },
  { href: '/pricing',   label: 'Тарифы' },
  { href: '/how-it-works', label: 'Как работает' },
];

/* Routes that have a dark hero — header starts transparent on them */
const DARK_HERO_ROUTES = ['/'];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const isDarkRoute = DARK_HERO_ROUTES.includes(pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const headerClass = cn(
    'header-unity',
    isDarkRoute
      ? scrolled && 'is-scrolled'
      : 'is-light',
  );

  const navLinkClass = (href: string) =>
    cn(
      'text-sm font-medium transition-colors duration-200',
      pathname === href
        ? 'text-[color:var(--u-emerald-light)] border-b-2 border-[color:var(--u-emerald-light)] pb-0.5'
        : isDarkRoute && !scrolled
          ? 'text-[color:var(--u-text-secondary)] hover:text-white'
          : 'text-gray-600 hover:text-gray-900',
    );

  return (
    <header className={headerClass}>
      <div className="container-page flex h-16 items-center justify-between gap-4 min-w-0">

        {/* Logo (flush left) + Nav */}
        <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-8">
          <Link
            href="/"
            className="-ml-4 flex shrink-0 items-center pl-1 sm:-ml-6 sm:pl-2 lg:-ml-10 lg:pl-2"
            aria-label="Юнити — главная"
          >
            <Image
              src="/logo.svg"
              alt="Юнити"
              width={96}
              height={48}
              className="block h-12 w-24 object-contain"
              priority
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-6" aria-label="Основная навигация">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/auth/login"
            className={cn(
              'rounded-[var(--u-radius-md)] px-4 py-2 text-sm font-medium transition-colors',
              isDarkRoute && !scrolled
                ? 'text-[color:var(--u-text-secondary)] hover:text-white hover:bg-white/08'
                : 'text-gray-700 hover:bg-gray-100',
            )}
          >
            Войти
          </Link>
          <Link
            href="/auth/register"
            className="header-cta-btn"
          >
            Регистрация
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className={cn(
            'lg:hidden rounded-[var(--u-radius-md)] p-2 transition-colors',
            isDarkRoute && !scrolled
              ? 'text-[color:var(--u-text-secondary)] hover:bg-white/08 hover:text-white'
              : 'text-gray-600 hover:bg-gray-100',
          )}
          aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t"
          style={{
            background: 'rgba(13,31,23,0.97)',
            borderColor: 'var(--u-border)',
          }}
        >
          <nav className="container-page py-4 space-y-1" aria-label="Мобильная навигация">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-[var(--u-radius-md)] px-3 py-2.5 text-base font-medium transition-colors',
                  pathname === item.href
                    ? 'text-[color:var(--u-emerald-light)] bg-white/05'
                    : 'text-[color:var(--u-text-secondary)] hover:text-white hover:bg-white/05',
                )}
              >
                {item.label}
              </Link>
            ))}
            <div
              className="border-t pt-3 mt-3 flex gap-3"
              style={{ borderColor: 'var(--u-border)' }}
            >
              <Link
                href="/auth/login"
                className="flex-1 text-center rounded-[var(--u-radius-md)] px-4 py-2.5 text-sm font-medium border transition-colors text-[color:var(--u-text-secondary)] hover:text-white"
                style={{ borderColor: 'var(--u-border-hover)' }}
              >
                Войти
              </Link>
              <Link
                href="/auth/register"
                className="flex-1 text-center rounded-[var(--u-radius-md)] px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ background: 'var(--u-emerald)' }}
              >
                Регистрация
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
