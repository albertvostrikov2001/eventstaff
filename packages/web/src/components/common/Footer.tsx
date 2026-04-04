import Link from 'next/link';
import Image from 'next/image';

const FOOTER_LINKS = {
  platform: {
    title: 'Платформа',
    links: [
      { href: '/vacancies', label: 'Вакансии' },
      { href: '/workers',   label: 'Специалисты' },
      { href: '/employers', label: 'Работодатели' },
      { href: '/pricing',   label: 'Тарифы' },
    ],
  },
  company: {
    title: 'О сервисе',
    links: [
      { href: '/about',        label: 'О нас' },
      { href: '/how-it-works', label: 'Как работает' },
      { href: '/help',         label: 'Помощь' },
      { href: '/contacts',     label: 'Контакты' },
    ],
  },
  legal: {
    title: 'Документы',
    links: [
      { href: '/legal/terms',   label: 'Пользовательское соглашение' },
      { href: '/legal/privacy', label: 'Политика конфиденциальности' },
      { href: '/legal/offer',   label: 'Оферта' },
    ],
  },
};

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--u-bg-dark)',
        borderTop: '1px solid var(--u-border)',
      }}
    >
      <div className="container-page py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand column */}
          <div>
            <Link href="/" aria-label="Юнити — главная">
              <Image
                src="/logo.svg"
                alt="Юнити"
                width={130}
                height={44}
                className="object-contain"
              />
            </Link>
            <p
              className="mt-4 text-sm leading-relaxed max-w-[220px]"
              style={{ color: 'var(--u-text-secondary)' }}
            >
              Специализированная биржа труда для event-персонала в&nbsp;ресторанном бизнесе
              и&nbsp;сфере гостеприимства.
            </p>
          </div>

          {/* Link columns */}
          {Object.values(FOOTER_LINKS).map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs"
          style={{
            borderTop: '1px solid var(--u-border)',
            color: 'var(--u-text-muted)',
          }}
        >
          <span>&copy; {new Date().getFullYear()} Юнити. Все права защищены.</span>
          <span>Персонал для профессионалов гостеприимства</span>
        </div>
      </div>
    </footer>
  );
}
