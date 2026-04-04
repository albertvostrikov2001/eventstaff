import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Свяжитесь с командой Юнити: email, телефон, адрес в Новороссийске, часы работы поддержки.',
};

export default function ContactsPage() {
  return (
    <div className="container-page py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Контакты</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-gray-500">
          Напишите нам по почте или оставьте сообщение через форму — ответим в рабочие часы.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex gap-4 rounded-card border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Электронная почта</p>
              <a href="mailto:info@unity-staff.ru" className="mt-1 block text-base font-semibold text-primary-600 hover:text-primary-700">
                info@unity-staff.ru
              </a>
            </div>
          </div>
          <div className="flex gap-4 rounded-card border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Телефон</p>
              <p className="mt-1 text-base font-semibold text-gray-900">+7 (000) 000-00-00</p>
              <p className="mt-1 text-xs text-gray-400">Номер будет указан после запуска линии поддержки</p>
            </div>
          </div>
          <div className="flex gap-4 rounded-card border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-100 text-secondary-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Адрес</p>
              <p className="mt-1 text-base text-gray-700">353900, Россия, г. Новороссийск</p>
              <p className="mt-1 text-sm text-gray-500">Юридический и почтовый адрес компании</p>
            </div>
          </div>
          <div className="flex gap-4 rounded-card border border-primary-100 bg-primary-50/50 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Часы работы поддержки</p>
              <p className="mt-1 text-base text-gray-800">Пн–Пт: 10:00–19:00 (МСК)</p>
              <p className="mt-1 text-sm text-gray-500">Сб, Вс — выходные, срочные обращения по email</p>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Форма обратной связи</h2>
          <p className="mt-1 text-sm text-gray-500">
            Заполните поля — после подключения обработки формы сообщения будут отправляться в поддержку.
          </p>
          <form className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">
                Имя
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                placeholder="Как к вам обращаться"
                disabled
                className="mt-1 w-full rounded-input border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                disabled
                className="mt-1 w-full rounded-input border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700">
                Сообщение
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                placeholder="Кратко опишите вопрос"
                disabled
                className="mt-1 w-full resize-none rounded-input border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 shadow-sm"
              />
            </div>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-input bg-gray-200 py-2.5 text-sm font-semibold text-gray-500"
            >
              Отправить (скоро)
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Пока пишите напрямую на{' '}
            <a href="mailto:info@unity-staff.ru" className="font-medium text-primary-600 hover:text-primary-700">
              info@unity-staff.ru
            </a>
            {' '}или воспользуйтесь{' '}
            <Link href="/help" className="font-medium text-primary-600 hover:text-primary-700">
              центром помощи
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
