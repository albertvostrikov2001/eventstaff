import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle, Heart, Building2, UtensilsCrossed, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Для работодателей',
  description:
    'Быстрый подбор персонала для мероприятий: свадьбы, корпоративы, кейтеринг. Преимущества платформы Юнити для работодателей.',
};

const USE_CASES = [
  {
    icon: Heart,
    title: 'Свадьбы и частные праздники',
    desc: 'Официанты, бармены, хостес и координаторы для банкетов и выездных церемоний.',
  },
  {
    icon: Building2,
    title: 'Корпоративные мероприятия',
    desc: 'Команда для конференций, тимбилдинов и презентаций — с опытом работы в B2B-сегменте.',
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
    <div className="container-page py-16">
      <section className="rounded-card border border-gray-200 bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 p-10 text-center text-white shadow-lg sm:p-14">
        <h1 className="text-3xl font-bold sm:text-4xl">Для работодателей</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">
          Найдите персонал для мероприятия за часы, а не недели. Юнити объединяет проверенных специалистов
          event-индустрии в одном каталоге — с рейтингами, отзывами и удобным бронированием.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-center text-2xl font-bold text-gray-900">Где мы помогаем</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {USE_CASES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-card border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-200 hover:shadow-card-hover"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Преимущества платформы</h2>
            <ul className="mt-6 space-y-4">
              {BENEFITS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-gray-600">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-primary-500 p-6 shadow-sm ring-2 ring-primary-500/20">
            <span className="inline-block rounded-badge bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
              Тарифы
            </span>
            <h3 className="mt-3 text-lg font-semibold text-gray-900">Краткий обзор</h3>
            <p className="mt-2 text-sm text-gray-500">
              Стартовый план — бесплатно: несколько активных вакансий и базовый поиск. Платные тарифы открывают
              больше контактов, приоритетную модерацию и продвижение. Подробные цены — на странице тарифов.
            </p>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-900">Бесплатно</span> — для теста и небольших команд
              </p>
              <p>
                <span className="font-medium text-gray-900">Базовый и Профессиональный</span> — для регулярных
                наймов
              </p>
              <p>
                <span className="font-medium text-gray-900">Корпоративный</span> — индивидуальные условия
              </p>
            </div>
            <Link
              href="/pricing"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-input border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Смотреть все тарифы
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-14 text-center">
        <p className="text-lg font-medium text-gray-900">Готовы закрыть смену персоналом?</p>
        <Link
          href="/auth/register?role=employer"
          className="mt-4 inline-flex items-center gap-2 rounded-card bg-primary-500 px-8 py-3 text-base font-semibold text-white transition hover:bg-primary-600"
        >
          Создать аккаунт работодателя
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
