import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ChevronRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Документы и оферты',
  description: 'Публичные оферты, пользовательское соглашение, политика конфиденциальности и согласия на обработку персональных данных.',
  alternates: { canonical: '/legal/offer' },
};

const DOCS: { href: string; title: string; desc: string }[] = [
  { href: '/legal/offer/employers', title: 'Публичная оферта для работодателей', desc: 'Условия оказания платных услуг для работодателей.' },
  { href: '/legal/offer/workers', title: 'Публичная оферта для соискателей', desc: 'Условия оказания платных услуг для соискателей.' },
  { href: '/legal/terms', title: 'Пользовательское соглашение', desc: 'Правила использования платформы для всех пользователей.' },
  { href: '/legal/privacy', title: 'Политика конфиденциальности', desc: 'Как обрабатываются и защищаются персональные данные.' },
  { href: '/legal/consent/employers', title: 'Согласие на обработку ПД — работодатели', desc: 'Согласие на распространение персональных данных представителя работодателя.' },
  { href: '/legal/consent/workers', title: 'Согласие на обработку ПД — соискатели', desc: 'Согласие на распространение персональных данных соискателя.' },
];

export default function LegalHubPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs items={[{ label: 'Документы' }]} />
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Документы платформы</h1>
          <p className="mt-2 text-sm text-white/50">
            Правовые документы, регулирующие использование платформы и обработку персональных данных.
          </p>

          <div className="mt-8 space-y-3">
            {DOCS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="group flex items-center gap-4 rounded-card border border-white/[0.08] bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-[var(--accent)]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-white/90 group-hover:text-white">{d.title}</h2>
                  <p className="mt-0.5 text-sm text-white/50">{d.desc}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition group-hover:text-white/60" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
