'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, MapPin, Clock, CheckCircle2, AlertCircle, Send, MessageCircle, UserRound, Mail } from 'lucide-react';
import {
  SITE_PHONE_DISPLAY,
  SITE_PHONE_TEL,
  SITE_PHONE_HOURS,
  SITE_TELEGRAM_URL,
  SITE_MAX_TEL,
  SITE_OWNER_NAME,
  SITE_OWNER_TITLE,
} from '@/content/siteContact';
import { config } from '@/lib/config';

const CONTACT_INPUT_CLASS =
  'mt-1 w-full rounded-input border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white/90 placeholder:text-white/35 [color-scheme:dark] outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40';

export default function ContactsPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) return;

    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${config.apiUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), message: message.trim() }),
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
      setPhone('');
      setMessage('');
    } catch {
      setErrorMsg('Не удалось отправить сообщение. Проверьте подключение.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
    <div className="container-page py-16">
      <div className="text-center">
        <h1
          className="text-white"
          style={{ fontFamily: 'var(--font-playfair, "Playfair Display", serif)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600 }}
        >
          Контакты
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Позвоните нам или оставьте сообщение через форму — ответим в рабочие часы.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Left: contact info */}
        <div className="space-y-4">
          {/* Owner direct-contact plashka */}
          <div className="rounded-card border border-emerald-500/30 p-5" style={{ background: 'linear-gradient(180deg, rgba(45,106,74,0.16) 0%, rgba(255,255,255,0.03) 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[var(--accent)]">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">{SITE_OWNER_NAME}, {SITE_OWNER_TITLE}</p>
                <p className="text-sm text-white/60">Отвечу на любые вопросы лично</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Есть вопрос по платформе, тарифам или сотрудничеству? Свяжитесь со мной напрямую — помогу разобраться и отвечу быстро.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <a
                href={SITE_PHONE_TEL}
                className="inline-flex items-center gap-1.5 rounded-input bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                <Phone className="h-4 w-4" /> Позвонить
              </a>
              <a
                href={SITE_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-input border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/[0.06]"
              >
                <Send className="h-4 w-4" /> Написать в Telegram
              </a>
            </div>
          </div>

          <div className="flex gap-4 rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-[var(--accent)]">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/55">Телефон</p>
              <a href={SITE_PHONE_TEL} className="mt-1 block text-base font-semibold text-[var(--accent)] hover:underline">
                {SITE_PHONE_DISPLAY}
              </a>
              <p className="mt-1 text-xs text-white/50">{SITE_PHONE_HOURS}</p>
            </div>
          </div>

          {/* Связаться в TG */}
          <div id="tg" className="flex scroll-mt-24 gap-4 rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/15 text-[#229ED9]">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/55">Связаться в TG</p>
              <a
                href={SITE_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-base font-semibold text-[var(--accent)] hover:underline"
              >
                Написать в Telegram
              </a>
              <p className="mt-1 text-xs text-white/50">Откроется чат с нами в Telegram</p>
            </div>
          </div>

          {/* Связаться в MAX */}
          <div id="max" className="flex scroll-mt-24 gap-4 rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/55">Связаться в MAX</p>
              <a href={SITE_MAX_TEL} className="mt-1 block text-base font-semibold text-[var(--accent)] hover:underline">
                {SITE_PHONE_DISPLAY}
              </a>
              <p className="mt-1 text-xs text-white/50">Мы на связи в MAX по этому номеру — позвоните или найдите нас в приложении</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex gap-4 rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-[var(--accent)]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/55">Почта</p>
              <a
                href="mailto:Event-Unity@yandex.ru"
                className="mt-1 block text-base font-semibold text-[var(--accent)] hover:underline"
              >
                Event-Unity@yandex.ru
              </a>
              <p className="mt-1 text-xs text-white/50">Напишите нам — ответим в рабочее время</p>
            </div>
          </div>

          <div className="flex gap-4 rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(198,132,92,0.15)] text-[var(--u-mocha,#c6845c)]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/55">Адрес</p>
              <p className="mt-1 text-base text-white/75">353900, Россия, г. Новороссийск</p>
              <p className="mt-1 text-sm text-white/50">Юридический и почтовый адрес компании</p>
            </div>
          </div>

          <div className="flex gap-4 rounded-card border border-emerald-500/25 p-5" style={{ background: 'rgba(45,106,74,0.08)' }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-[var(--accent)]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/55">Часы работы поддержки</p>
              <p className="mt-1 text-base text-white/85">Пн–Пт: 10:00–21:00 (МСК)</p>
              <p className="mt-1 text-sm text-white/50">Сб, Вс — выходные, срочные обращения по телефону</p>
            </div>
          </div>
        </div>

        {/* Right: contact form */}
        <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
          <h2 className="text-lg font-semibold text-white">Форма обратной связи</h2>
          <p className="mt-1 text-sm text-white/55">
            Заполните поля — мы перезвоним или напишем в ближайший рабочий день.
          </p>

          {status === 'success' ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-card border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="text-base font-semibold text-emerald-200">Сообщение отправлено!</p>
              <p className="text-sm text-emerald-300/80">
                Мы получили ваше обращение и свяжемся по указанному номеру в рабочее время.
              </p>
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="mt-2 rounded-input border border-emerald-500/40 px-5 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
              >
                Отправить ещё одно
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-white/75">
                  Имя <span className="text-red-400">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к Вам обращаться"
                  required
                  minLength={2}
                  maxLength={200}
                  className={CONTACT_INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="contact-phone" className="block text-sm font-medium text-white/75">
                  Телефон <span className="text-red-400">*</span>
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 900 000 00 00"
                  required
                  maxLength={40}
                  className={CONTACT_INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-white/75">
                  Сообщение <span className="text-red-400">*</span>
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
                  className={`${CONTACT_INPUT_CLASS} resize-none`}
                />
                <p className="mt-1 text-right text-xs text-white/40">{message.length}/4000</p>
              </div>

              {status === 'error' && (
                <div className="flex items-start gap-2 rounded-input border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !name.trim() || !phone.trim() || !message.trim()}
                className="w-full rounded-input bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading' ? 'Отправляем…' : 'Отправить сообщение'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
