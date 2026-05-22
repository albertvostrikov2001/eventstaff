'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL, SITE_PHONE_HOURS } from '@/content/siteContact';
import { config } from '@/lib/config';

export default function ContactsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${config.apiUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg =
          json?.message ||
          (res.status === 429 ? 'Слишком много запросов. Попробуйте позже.' : 'Ошибка отправки');
        setErrorMsg(msg);
        setStatus('error');
        return;
      }
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setErrorMsg('Не удалось отправить сообщение. Проверьте подключение.');
      setStatus('error');
    }
  };

  return (
    <div className="container-page py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Контакты</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-gray-500">
          Напишите нам по почте или оставьте сообщение через форму — ответим в рабочие часы.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Left: contact info */}
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
              <a href={SITE_PHONE_TEL} className="mt-1 block text-base font-semibold text-primary-600 hover:text-primary-700">
                {SITE_PHONE_DISPLAY}
              </a>
              <p className="mt-1 text-xs text-gray-500">{SITE_PHONE_HOURS}</p>
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

        {/* Right: contact form */}
        <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Форма обратной связи</h2>
          <p className="mt-1 text-sm text-gray-500">
            Заполните поля — мы ответим в ближайший рабочий день.
          </p>

          {status === 'success' ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-card border border-green-200 bg-green-50 p-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-base font-semibold text-green-800">Сообщение отправлено!</p>
              <p className="text-sm text-green-700">
                Мы получили ваше обращение и ответим на&nbsp;{email || 'указанный email'} в&nbsp;рабочее время.
              </p>
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="mt-2 rounded-input border border-green-300 px-5 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
              >
                Отправить ещё одно
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к вам обращаться"
                  required
                  minLength={2}
                  maxLength={200}
                  className="mt-1 w-full rounded-input border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  maxLength={320}
                  className="mt-1 w-full rounded-input border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700">
                  Сообщение <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Опишите ваш вопрос или предложение"
                  required
                  minLength={10}
                  maxLength={4000}
                  className="mt-1 w-full resize-none rounded-input border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <p className="mt-1 text-right text-xs text-gray-400">{message.length}/4000</p>
              </div>

              {status === 'error' && (
                <div className="flex items-start gap-2 rounded-input border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !name.trim() || !email.trim() || !message.trim()}
                className="w-full rounded-input bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading' ? 'Отправляем…' : 'Отправить сообщение'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
