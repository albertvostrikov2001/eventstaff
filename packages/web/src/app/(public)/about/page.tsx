import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Shield, Zap, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'О сервисе',
  description:
    'Юнити — специализированная площадка для поиска и найма персонала для мероприятий. Миссия, история и ценности команды.',
};

export default function AboutPage() {
  return (
    <div className="container-page py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">О сервисе</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-500">
          Мы соединяем организаторов событий и профессионалов индустрии гостеприимства
        </p>
      </div>

      <section className="mt-14">
        <div className="rounded-card border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Наша миссия</h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Юнити — это специализированный маркетплейс для поиска и найма event-персонала: от официантов и
            барменов до координаторов и технического персонала. Мы делаем так, чтобы заказчики быстро находили
            проверенных специалистов, а исполнители — честные заказы и прозрачные условия сотрудничества.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <div className="rounded-card border border-secondary-200 bg-secondary-50/40 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Как всё началось</h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Идея сервиса родилась в Новороссийске: здесь активно развивается событийная индустрия — свадьбы,
            корпоративы, фестивали у моря. Команда столкнулась с тем, что подбор персонала для мероприятий
            занимал недели, а ответственность за качество часто оставалась на словах. Мы решили собрать в одном
            месте профили специалистов, отзывы и инструменты бронирования — чтобы организаторы экономили время, а
            специалисты — нервы.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-center text-2xl font-bold text-gray-900">Ценности команды</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-card border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">Доверие</h3>
            <p className="mt-2 text-sm text-gray-500">
              Прозрачные профили, отзывы после смен и честные правила платформы для всех сторон.
            </p>
          </div>
          <div className="rounded-card border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">Скорость</h3>
            <p className="mt-2 text-sm text-gray-500">
              От публикации вакансии до первых откликов — без лишних звонков и бумажной волокиты.
            </p>
          </div>
          <div className="rounded-card border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-100 text-secondary-600">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">Качество</h3>
            <p className="mt-2 text-sm text-gray-500">
              Мы ориентируемся на стандарты индустрии гостеприимства и поддерживаем развитие специалистов.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-14 rounded-card border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-8 text-center shadow-sm">
        <Heart className="mx-auto h-8 w-8 text-primary-500" aria-hidden />
        <p className="mt-4 text-lg font-medium text-gray-900">Присоединяйтесь к Юнити</p>
        <p className="mt-2 text-gray-600">
          Создайте аккаунт и начните пользоваться платформой уже сегодня.
        </p>
        <Link
          href="/auth/register"
          className="mt-6 inline-flex items-center gap-2 rounded-card bg-primary-500 px-8 py-3 text-base font-semibold text-white transition hover:bg-primary-600"
        >
          Зарегистрироваться
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
