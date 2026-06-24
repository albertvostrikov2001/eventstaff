import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Shield, Zap, Award } from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'О сервисе',
  description:
    'Юнити — специализированная площадка для поиска и найма персонала для мероприятий. Миссия, история и ценности команды.',
  alternates: { canonical: '/about' },
};

const PLAYFAIR = 'var(--font-playfair, "Playfair Display", serif)';

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
      <BreadcrumbJsonLd items={[{ name: 'Главная', path: '/' }, { name: 'О сервисе', path: '/about' }]} />
      <div className="container-page py-16">
        <div className="text-center">
          <h1
            className="text-white"
            style={{ fontFamily: PLAYFAIR, fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600, lineHeight: 1.2 }}
          >
            О сервисе
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Мы соединяем организаторов событий и профессионалов индустрии гостеприимства
          </p>
        </div>

        <section className="mt-14">
          <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-8">
            <h2 className="text-2xl font-bold text-white">Наша миссия</h2>
            <p className="mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Юнити — это специализированная платформа для поиска и найма event-персонала: от официантов и
              барменов до координаторов и технического персонала. Мы делаем так, чтобы заказчики быстро находили
              проверенных специалистов, а исполнители — честные заказы и прозрачные условия сотрудничества.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div
            className="rounded-card border border-white/[0.08] p-8"
            style={{ background: 'linear-gradient(160deg, rgba(198,132,92,0.1) 0%, rgba(255,255,255,0.04) 60%)' }}
          >
            <h2 className="text-2xl font-bold text-white">Как всё началось</h2>
            <p className="mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Идея сервиса родилась в Новороссийске: здесь активно развивается событийная индустрия — свадьбы,
              корпоративы, фестивали у моря. Команда столкнулась с тем, что подбор персонала для мероприятий
              занимал недели, а ответственность за качество часто оставалась на словах. Мы решили собрать в одном
              месте профили специалистов, отзывы и инструменты бронирования — чтобы организаторы экономили время, а
              специалисты — нервы.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-center text-2xl font-bold text-white">Ценности команды</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6 text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: 'rgba(45,106,74,0.15)' }}
              >
                <Shield className="h-6 w-6" style={{ color: 'var(--u-emerald-light)' }} />
              </div>
              <h3 className="mt-4 font-semibold text-white">Доверие</h3>
              <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Прозрачные профили, отзывы после смен и честные правила платформы для всех сторон.
              </p>
            </div>
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6 text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: 'rgba(45,106,74,0.15)' }}
              >
                <Zap className="h-6 w-6" style={{ color: 'var(--u-emerald-light)' }} />
              </div>
              <h3 className="mt-4 font-semibold text-white">Скорость</h3>
              <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                От публикации вакансии до первых откликов — без лишних звонков и бумажной волокиты.
              </p>
            </div>
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6 text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: 'rgba(198,132,92,0.15)' }}
              >
                <Award className="h-6 w-6" style={{ color: 'var(--u-mocha, #c6845c)' }} />
              </div>
              <h3 className="mt-4 font-semibold text-white">Качество</h3>
              <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Мы ориентируемся на стандарты индустрии гостеприимства и поддерживаем развитие специалистов.
              </p>
            </div>
          </div>
        </section>

        <div
          className="mt-14 rounded-card border p-8 text-center"
          style={{
            borderColor: 'rgba(45,106,74,0.35)',
            background: 'linear-gradient(180deg, rgba(45,106,74,0.12) 0%, rgba(255,255,255,0.04) 100%)',
          }}
        >
          <Heart className="mx-auto h-8 w-8" style={{ color: 'var(--u-emerald-light)' }} aria-hidden />
          <p className="mt-4 text-lg font-medium text-white">Присоединяйтесь к Юнити</p>
          <p className="mt-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Создайте аккаунт и начните пользоваться платформой уже сегодня.
          </p>
          <Link
            href="/auth/register"
            className="mt-6 inline-flex items-center gap-2 rounded-[12px] px-8 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--u-gradient-primary)', boxShadow: '0 4px 16px rgba(45,106,74,0.3)' }}
          >
            Зарегистрироваться
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
