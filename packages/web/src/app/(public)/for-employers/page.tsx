import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle, Heart, Building2, UtensilsCrossed, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Для работодателей',
  description:
    'Быстрый подбор персонала для мероприятий: свадьбы, корпоративы, кейтеринг. Преимущества платформы Юнити для работодателей.',
};

const PLAYFAIR = 'var(--font-playfair, "Playfair Display", serif)';

const USE_CASES = [
  {
    icon: Heart,
    title: 'Свадьбы и частные праздники',
    desc: 'Официанты, бармены, хостес и координаторы для банкетов и выездных церемоний.',
  },
  {
    icon: Building2,
    title: 'Корпоративные мероприятия',
    desc: 'Команда для конференций, тимбилдингов и презентаций — с опытом работы в B2B-сегменте.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Кейтеринг и фуршеты',
    desc: 'Персонал для сервиса за столом, раздачи и зоны ресепшн на любой масштаб.',
  },
];

const BENEFITS = [
  'Публикация вакансий и просмотр анкет в едином интерфейсе',
  'Фильтры по опыту, рейтингу и типу мероприятий',
  'Встроенные сообщения для согласования деталей смены',
  'История найма и отзывы — для повторных заказов с теми же специалистами',
  'Гибкие тарифы: начните бесплатно и масштабируйтесь по мере роста',
];

export default function ForEmployersPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
      <div className="container-page py-16 lg:py-24">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-[20px] p-10 text-center sm:p-14"
          style={{
            background:
              'linear-gradient(160deg, rgba(45,106,74,0.18) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 0 60px rgba(45,106,74,0.12)',
          }}
        >
          <h1
            className="text-white"
            style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600, lineHeight: 1.2 }}
          >
            Для работодателей
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[1.0625rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Найдите персонал для мероприятия за часы, а не недели. Юнити объединяет проверенных специалистов
            event-индустрии в одном каталоге — с рейтингами, отзывами и удобным бронированием.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register?role=employer"
              className="inline-flex items-center gap-2 rounded-[12px] px-7 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--u-gradient-primary)', boxShadow: '0 4px 16px rgba(45,106,74,0.3)' }}
            >
              Создать аккаунт работодателя
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/workers"
              className="inline-flex items-center gap-2 rounded-[12px] px-7 py-3.5 text-base font-semibold transition-all"
              style={{ border: '1.5px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }}
            >
              Смотреть каталог специалистов
            </Link>
          </div>
        </section>

        {/* Use cases */}
        <section className="mt-16">
          <h2
            className="text-center text-white"
            style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 600 }}
          >
            Где мы помогаем
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {USE_CASES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-[16px] p-6 transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(45,106,74,0.15)' }}
                >
                  <Icon className="h-5 w-5" style={{ color: 'var(--u-emerald-light)' }} strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits + tariff overview */}
        <section className="mt-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <h2
                className="text-white"
                style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 600 }}
              >
                Преимущества платформы
              </h2>
              <ul className="mt-6 space-y-4">
                {BENEFITS.map((item) => (
                  <li key={item} className="flex items-start gap-3" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <CheckCircle
                      className="mt-0.5 h-5 w-5 flex-shrink-0"
                      style={{ color: 'var(--u-emerald-light)' }}
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-[16px] p-7"
              style={{
                border: '1.5px solid var(--u-emerald-light)',
                background: 'linear-gradient(180deg, rgba(45,106,74,0.1) 0%, rgba(255,255,255,0.04) 100%)',
                boxShadow: '0 0 40px rgba(45,106,74,0.12)',
              }}
            >
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ background: 'var(--u-emerald)' }}
              >
                Тарифы
              </span>
              <h3 className="mt-3 text-lg font-semibold text-white">Краткий обзор</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Стартовый план — бесплатно: несколько активных вакансий и базовый поиск. Платные тарифы открывают
                полный каталог, прямые приглашения, аналитику и продвижение. Подробные цены — на странице тарифов.
              </p>
              <div className="mt-4 space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <p>
                  <span className="font-semibold text-white">Старт</span> — бесплатно, для теста и небольших команд
                </p>
                <p>
                  <span className="font-semibold text-white">Бизнес</span> — для активного и регулярного найма
                </p>
                <p>
                  <span className="font-semibold text-white">Про</span> — безлимит и vip-доступ для агентств
                </p>
              </div>
              <Link
                href="/pricing"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[10px] py-3 text-sm font-semibold transition-all"
                style={{ border: '1.5px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.85)' }}
              >
                Смотреть все тарифы
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg font-medium text-white">Готовы закрыть смену персоналом?</p>
          <Link
            href="/auth/register?role=employer"
            className="mt-4 inline-flex items-center gap-2 rounded-[12px] px-8 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--u-gradient-primary)', boxShadow: '0 4px 16px rgba(45,106,74,0.3)' }}
          >
            Создать аккаунт работодателя
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
