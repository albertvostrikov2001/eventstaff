import type { ReactNode } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LEGAL } from '@/content/legalRequisites';

/** Тёмная оболочка юридической страницы с хлебными крошками и заголовком. */
export function LegalShell({
  breadcrumbLabel,
  title,
  subtitle,
  intro,
  children,
}: {
  breadcrumbLabel: string;
  title: string;
  subtitle?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs
            items={[
              { label: 'Документы', href: '/legal/offer' },
              { label: breadcrumbLabel },
            ]}
          />
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-white/50">{subtitle}</p>}
          {intro && (
            <div className="mt-6 leading-relaxed text-white/70">{intro}</div>
          )}
          <div className="mt-8 space-y-8 text-white/70">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Раздел документа с заголовком. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

/** Маркированный список пунктов документа. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Блок реквизитов ИП. heading — заголовок (Исполнитель/Администратор/Оператор). */
export function LegalRequisites({ heading = 'Реквизиты' }: { heading?: string }) {
  const rows: [string, string][] = [
    ['Наименование', LEGAL.ipFull],
    ['ИНН', LEGAL.inn],
    ['ОГРНИП', LEGAL.ogrnip],
    ['Адрес', LEGAL.address],
    ['E-mail', LEGAL.email],
    ['Сайт', LEGAL.siteDomain],
    ['Банк', LEGAL.bank.name],
    ['Расчётный счёт', LEGAL.bank.account],
    ['БИК', LEGAL.bank.bik],
    ['Корр. счёт', LEGAL.bank.corrAccount],
  ];
  return (
    <section className="rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
      <h2 className="text-lg font-bold text-white sm:text-xl">{heading}</h2>
      <dl className="mt-4 divide-y divide-white/[0.06]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-white/45">{k}</dt>
            <dd className="font-medium text-white/85 [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Ссылки на связанные документы внизу страницы. */
export function LegalRelated({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <p className="mt-10 border-t border-white/[0.08] pt-6 text-sm text-white/50">
      Связанные документы:{' '}
      {links.map((l, i) => (
        <span key={l.href}>
          {i > 0 && ' · '}
          <Link href={l.href} className="text-[var(--accent)] hover:underline">
            {l.label}
          </Link>
        </span>
      ))}
    </p>
  );
}
