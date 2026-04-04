import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlus, Search, Star, Briefcase, PartyPopper, Coffee, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Для специалистов',
  description:
    'Зарабатывайте на мероприятиях с гибким графиком. Профиль, вакансии и репутация на платформе Юнити.',
};

const STEPS = [
  { icon: UserPlus, title: 'Регистрация', desc: 'Укажите роль «специалист» и подтвердите контакты.' },
  { icon: Briefcase, title: 'Профиль', desc: 'Специализация, опыт, фото и портфолио — чем полнее анкета, тем выше доверие.' },
  { icon: Search, title: 'Вакансии', desc: 'Ищите в каталоге или откликайтесь на подходящие смены.' },
];

const JOB_TYPES = [
  { icon: Coffee, label: 'Бар и кофе', text: 'Бармены, бариста, миксологи' },
  { icon: PartyPopper, label: 'Сервис и зал', text: 'Официанты, хостес, координаторы зала' },
  { icon: Briefcase, label: 'Организация', text: 'Координаторы событий, промо, технический персонал' },
];

export default function ForWorkersPage() {
  return (
    <div className="container-page py-16">
      <section className="rounded-card border border-gray-200 bg-white p-10 text-center shadow-sm sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Для специалистов</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
          Зарабатывайте на мероприятиях с удобным графиком. Юнити помогает находить заказы, договариваться о
          условиях и укреплять репутацию через отзывы работодателей.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-center text-2xl font-bold text-gray-900">Как создать профиль</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-card border border-gray-200 bg-gray-50/80 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 text-sm font-bold text-secondary-600">
                {i + 1}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <step.icon className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-center text-2xl font-bold text-gray-900">Какие заказы бывают</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {JOB_TYPES.map(({ icon: Icon, label, text }) => (
            <div key={label} className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
              <Icon className="h-8 w-8 text-secondary-500" />
              <h3 className="mt-4 font-semibold text-gray-900">{label}</h3>
              <p className="mt-2 text-sm text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="rounded-card border border-secondary-200 bg-secondary-50/30 p-8 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <Star className="h-7 w-7 text-primary-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Репутация и отзывы</h2>
              <p className="mt-3 text-gray-600 leading-relaxed">
                После каждой смены работодатель может оставить оценку и комментарий. Высокий рейтинг помогает
                получать больше приглашений и выбирать интересные проекты. Мы поощряем честную обратную связь с
                обеих сторон — так формируется здоровое сообщество профессионалов.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-14 text-center">
        <Link
          href="/auth/register?role=worker"
          className="inline-flex items-center gap-2 rounded-card bg-primary-500 px-8 py-3 text-base font-semibold text-white transition hover:bg-primary-600"
        >
          Создать профиль специалиста
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-sm text-gray-500">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-700">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
