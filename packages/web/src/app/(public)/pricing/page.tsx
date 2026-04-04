import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Тарифы',
  description: 'Тарифные планы платформы Юнити для работодателей и специалистов',
};

const EMPLOYER_PLANS = [
  {
    name: 'Бесплатный',
    price: '0',
    period: '',
    features: [
      'До 3 активных вакансий',
      'Просмотр 5 контактов в месяц',
      'Базовый поиск кандидатов',
      'Внутренний чат',
    ],
    cta: 'Начать бесплатно',
    highlighted: false,
  },
  {
    name: 'Базовый',
    price: '2 990',
    period: '/мес',
    features: [
      'До 15 активных вакансий',
      'Просмотр 50 контактов в месяц',
      'Расширенные фильтры поиска',
      'Приоритетная модерация',
      'История найма',
    ],
    cta: 'Выбрать тариф',
    highlighted: false,
  },
  {
    name: 'Профессиональный',
    price: '7 990',
    period: '/мес',
    features: [
      'До 50 активных вакансий',
      'Просмотр 200 контактов в месяц',
      'Умные рекомендации кандидатов',
      'Бронирование специалистов',
      'Продвижение вакансий',
      'Приоритетная поддержка',
    ],
    cta: 'Выбрать тариф',
    highlighted: true,
  },
  {
    name: 'Корпоративный',
    price: 'По запросу',
    period: '',
    features: [
      'Безлимит вакансий',
      'Безлимит контактов',
      'Персональный менеджер',
      'API-доступ',
      'Кастомизация',
      'SLA',
    ],
    cta: 'Связаться с нами',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Тарифы</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-gray-500">
          Выберите подходящий план. Размещение вакансий бесплатно на старте.
        </p>
      </div>

      {/* Employer plans */}
      <div className="mt-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Для работодателей</h2>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {EMPLOYER_PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-card border p-6 shadow-sm ${
              plan.highlighted
                ? 'border-primary-500 ring-2 ring-primary-500/20'
                : 'border-gray-200'
            }`}
          >
            {plan.highlighted && (
              <span className="mb-4 inline-block rounded-badge bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                Популярный
              </span>
            )}
            <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
            <div className="mt-3">
              <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
              {plan.period && (
                <span className="text-sm text-gray-500"> ₽{plan.period}</span>
              )}
            </div>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/register?role=employer"
              className={`mt-6 block w-full rounded-input py-2.5 text-center text-sm font-semibold transition ${
                plan.highlighted
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Worker plans */}
      <div className="mt-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Для специалистов</h2>
        <p className="mt-2 text-sm text-gray-500">
          Базовый профиль — бесплатно. Премиум — для тех, кто хочет больше.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-card border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Базовый</h3>
          <div className="mt-3 text-3xl font-bold text-gray-900">Бесплатно</div>
          <ul className="mt-6 space-y-3">
            {['Профиль в каталоге', 'Отклик на вакансии', 'Внутренний чат', 'Получение отзывов'].map(
              (f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                  {f}
                </li>
              ),
            )}
          </ul>
          <Link
            href="/auth/register?role=worker"
            className="mt-6 block w-full rounded-input border border-gray-300 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Начать бесплатно
          </Link>
        </div>
        <div className="rounded-card border border-primary-500 p-6 shadow-sm ring-2 ring-primary-500/20">
          <span className="mb-4 inline-block rounded-badge bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
            Премиум
          </span>
          <h3 className="text-lg font-semibold text-gray-900">Премиум</h3>
          <div className="mt-3">
            <span className="text-3xl font-bold text-gray-900">990</span>
            <span className="text-sm text-gray-500"> ₽/мес</span>
          </div>
          <ul className="mt-6 space-y-3">
            {[
              'Всё из базового',
              'Выделение в каталоге',
              'Поднятие анкеты в поиске',
              'Премиум-шаблоны резюме',
              'Расширенная статистика',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/auth/register?role=worker"
            className="mt-6 block w-full rounded-input bg-primary-500 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-600"
          >
            Попробовать Премиум
          </Link>
        </div>
      </div>
    </div>
  );
}
