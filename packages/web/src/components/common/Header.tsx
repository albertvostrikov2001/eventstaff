'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '@/content/siteContact';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { useAuthStore, type AuthUser } from '@/stores/authStore';

const NAV_ITEMS = [
  { href: '/vacancies',     label: 'Вакансии' },
  { href: '/workers',       label: 'Специалисты' },
  { href: '/employers',     label: 'Работодатели' },
  { href: '/pricing',       label: 'Тарифы' },
  { href: '/how-it-works',  label: 'Как работает' },
  { href: '/contacts',      label: 'Контакты' },
];

function resolveCabinetHref(user: AuthUser): string {
  if (user.roles.includes('admin')) return '/admin/dashboard';
  if (user.activeRole === 'employer' || user.roles.includes('employer')) {
    return '/employer/dashboard';
  }
  return '/worker/dashboard';
}

export function Header() {
  const { user, isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasShadow, setHasShadow] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  /* Shadow appears only when scrolled > 8px */
  useEffect(() => {
    const onScroll = () => setHasShadow(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  /* Close drawer when resized to desktop */
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* Lock body scroll when drawer is open */
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  /* Focus trap: Escape closes drawer */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  const navLinkClass = (href: string) =>
    cn(
      'text-[15px] font-medium transition-colors duration-[var(--d-micro)] py-1.5',
      pathname === href
        ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-hover)] pb-1'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    );

  return (
    <header
      className={cn('header-unity', hasShadow && 'has-shadow')}
      style={{ height: 'var(--header-h, 72px)' }}
    >
      <div
        className="container-page flex h-full items-center justify-between gap-4 min-w-0"
        style={{ maxWidth: '1280px' }}
      >
        {/* Logo + Nav */}
        <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-8">
          <Logo size="md" showText />

          <nav
            className="hidden lg:flex items-center"
            style={{ gap: '28px' }}
            aria-label="Основная навигация"
          >
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Phone + Desktop auth */}
        <div className="hidden lg:flex min-w-0 items-center gap-2">
          <a
            href={SITE_PHONE_TEL}
            className="flex items-center gap-1.5 text-sm transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label={`Позвонить: ${SITE_PHONE_DISPLAY}`}
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{SITE_PHONE_DISPLAY}</span>
          </a>

          {isAuthenticated && user ? (
            <Link href={resolveCabinetHref(user)} className="header-cta-btn">
              Кабинет
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-[var(--r-4)] px-3.5 py-2 text-[0.875rem] font-medium transition-colors text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
              >
                Войти
              </Link>
              <Link href="/auth/register" className="header-cta-btn">
                Регистрация
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="lg:hidden rounded-[var(--r-3)] p-2 transition-colors text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-[var(--text-primary)]"
          aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-drawer"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setMobileMenuOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

          {/* Drawer panel */}
          <div
            id="mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Меню навигации"
            className="absolute right-0 top-0 bottom-0 w-[min(320px,100vw)] flex flex-col"
            style={{
              background: 'rgba(13, 31, 23, 0.98)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderLeft: '1px solid var(--u-border)',
            }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--u-border)' }}
            >
              <Logo size="md" showText />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-[var(--u-radius-md)] p-2 text-[color:var(--u-text-secondary)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
                aria-label="Закрыть меню"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1" aria-label="Мобильная навигация">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block rounded-[var(--r-3)] px-4 py-3 text-[1.0625rem] font-medium transition-colors',
                    pathname === item.href
                      ? 'text-[var(--accent)] bg-[var(--accent-faint)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.05]',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Bottom actions */}
            <div
              className="px-4 py-4 space-y-3"
              style={{ borderTop: '1px solid var(--u-border)' }}
            >
              <a
                href={SITE_PHONE_TEL}
                className="flex items-center gap-2 text-[0.9375rem] text-[color:var(--u-text-secondary)] hover:text-white transition-colors px-4 py-2"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                {SITE_PHONE_DISPLAY}
              </a>
              {isAuthenticated && user ? (
                <Link
                  href={resolveCabinetHref(user)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center rounded-[var(--r-4)] px-4 py-3 text-sm font-medium transition-colors"
                  style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }}
                >
                  Кабинет
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center rounded-[var(--r-4)] px-4 py-3 text-sm font-medium border border-[var(--border-strong)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  >
                    Войти
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center rounded-[var(--r-4)] px-4 py-3 text-sm font-medium transition-colors"
                    style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }}
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
