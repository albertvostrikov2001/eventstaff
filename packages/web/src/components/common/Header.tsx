'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, Briefcase, Users, MessageCircle } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '@/content/siteContact';

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { useAuthStore, type AuthUser } from '@/stores/authStore';

const NAV_ITEMS = [
  { href: '/vacancies',     label: 'Вакансии',     accent: false },
  { href: '/workers',       label: 'Специалисты',  accent: false },
  { href: '/employers',     label: 'Работодатели', accent: false },
  { href: '/pricing',       label: 'Тарифы',       accent: true  },
  { href: '/how-it-works',  label: 'Как работает', accent: false },
  { href: '/contacts',      label: 'Контакты',     accent: false },
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
  const [registerOpen, setRegisterOpen] = useState(false);
  const [hasShadow, setHasShadow] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const registerRef = useRef<HTMLDivElement>(null);

  /* Shadow appears only when scrolled > 8px */
  useEffect(() => {
    const onScroll = () => setHasShadow(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Close menus on route change */
  useEffect(() => {
    setMobileMenuOpen(false);
    setRegisterOpen(false);
  }, [pathname]);

  /* Close register dropdown on outside click */
  useEffect(() => {
    if (!registerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (registerRef.current && !registerRef.current.contains(e.target as Node)) {
        setRegisterOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [registerOpen]);

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

  const navLinkClass = (href: string, accent = false) =>
    cn(
      'text-[15px] font-medium transition-colors duration-[var(--d-micro)] py-1.5',
      pathname === href
        ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-hover)] pb-1'
        : accent
        ? 'text-[var(--accent)] hover:text-[var(--accent-hover)]'
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
              <Link key={item.href} href={item.href} className={navLinkClass(item.href, item.accent)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Phone + Desktop auth */}
        <div className="hidden lg:flex min-w-0 items-center gap-2">
          <Link
            href="/contacts#tg"
            className="flex items-center gap-1.5 text-sm transition-colors text-[#229ED9] hover:text-[#1a8bbf]"
            aria-label="Связаться в Telegram"
          >
            <TelegramIcon className="h-4 w-4 shrink-0" />
            <span className="font-medium">TG</span>
          </Link>
          <Link
            href="/contacts#max"
            className="flex items-center gap-1.5 text-sm transition-colors text-violet-300 hover:text-violet-200"
            aria-label="Связаться в MAX"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">MAX</span>
          </Link>
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
              <div className="relative" ref={registerRef}>
                <button
                  type="button"
                  onClick={() => setRegisterOpen((v) => !v)}
                  className="header-cta-btn"
                  aria-haspopup="menu"
                  aria-expanded={registerOpen}
                >
                  Регистрация
                </button>
                {registerOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-[var(--r-4)] py-1.5"
                    style={{
                      background: 'rgba(13, 31, 23, 0.98)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid var(--u-border-hover)',
                      boxShadow: '0 12px 32px -8px rgba(0,0,0,0.6)',
                    }}
                  >
                    <Link
                      href="/auth/register?role=employer"
                      role="menuitem"
                      onClick={() => setRegisterOpen(false)}
                      className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.06]"
                    >
                      <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Я работодатель</span>
                        <span className="block text-xs text-[var(--text-muted)]">Найти и нанять персонал</span>
                      </span>
                    </Link>
                    <Link
                      href="/auth/register?role=worker"
                      role="menuitem"
                      onClick={() => setRegisterOpen(false)}
                      className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.06]"
                    >
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Я ищу работу</span>
                        <span className="block text-xs text-[var(--text-muted)]">Создать анкету специалиста</span>
                      </span>
                    </Link>
                  </div>
                )}
              </div>
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
      {mobileMenuOpen && createPortal(
        <div
          className="fixed inset-0 z-[60] lg:hidden"
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
                      ? 'bg-[var(--accent)]/20 text-[#6cc792]'
                      : 'text-white/90 hover:bg-white/[0.06] hover:text-white',
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
              <Link
                href="/contacts#tg"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-[0.9375rem] text-[#229ED9] hover:text-[#1a8bbf] transition-colors px-4 py-2 font-medium"
              >
                <TelegramIcon className="h-4 w-4 shrink-0" />
                Связаться в Telegram
              </Link>
              <Link
                href="/contacts#max"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-[0.9375rem] text-violet-300 hover:text-violet-200 transition-colors px-4 py-2 font-medium"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                Связаться в MAX
              </Link>
              <a
                href={SITE_PHONE_TEL}
                className="flex items-center gap-2 text-[0.9375rem] text-white/80 hover:text-white transition-colors px-4 py-2"
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
                    className="block w-full text-center rounded-[var(--r-4)] px-4 py-3 text-sm font-medium border border-white/25 text-white/90 transition-colors hover:border-white/40 hover:text-white"
                  >
                    Войти
                  </Link>
                  <Link
                    href="/auth/register?role=employer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--r-4)] px-4 py-3 text-sm font-semibold transition-colors"
                    style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }}
                  >
                    <Briefcase className="h-4 w-4" aria-hidden="true" />
                    Я работодатель
                  </Link>
                  <Link
                    href="/auth/register?role=worker"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--r-4)] px-4 py-3 text-sm font-medium border transition-colors"
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
                  >
                    <Users className="h-4 w-4" aria-hidden="true" />
                    Я ищу работу
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
