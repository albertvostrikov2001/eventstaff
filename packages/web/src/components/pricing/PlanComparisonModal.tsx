'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
 * Попап «Сравните тарифы» — листаемое сравнение тарифов и разовых услуг
 * для работодателей и специалистов. Цифры синхронизированы со страницей
 * тарифов (PricingClient). Чисто витринный/обучающий компонент.
 * ────────────────────────────────────────────────────────────────────────── */

type Aud = 'employer' | 'worker' | 'services';

const E = '#4fa76e';
const EM = '#2d6a4a';
const MUT = 'rgba(255,255,255,0.14)';
const MUT2 = 'rgba(255,255,255,0.30)';

// ─── Схематичные мини-иллюстрации интерфейса (inline SVG) ──────────────────
function illResponses() {
  return `<svg viewBox="0 0 320 150"><g font-family="Inter,sans-serif">
    <rect x="14" y="22" width="130" height="106" rx="12" fill="rgba(255,255,255,0.03)" stroke="${MUT}"/>
    <text x="79" y="44" fill="rgba(255,255,255,0.45)" font-size="11" text-anchor="middle">Бесплатно</text>
    <text x="79" y="86" fill="#fff" font-size="30" font-weight="600" text-anchor="middle">5</text>
    <text x="79" y="108" fill="rgba(255,255,255,0.4)" font-size="11" text-anchor="middle">откликов / мес</text>
    <rect x="176" y="22" width="130" height="106" rx="12" fill="rgba(45,106,74,0.16)" stroke="${E}"/>
    <text x="241" y="44" fill="${E}" font-size="11" text-anchor="middle">Premium</text>
    <text x="241" y="88" fill="#fff" font-size="34" font-weight="600" text-anchor="middle">∞</text>
    <text x="241" y="108" fill="rgba(255,255,255,0.5)" font-size="11" text-anchor="middle">без ограничений</text>
  </g></svg>`;
}
function illCatalog() {
  const data = [false, true, false, false];
  let rows = '';
  data.forEach((h, i) => {
    const y = 18 + i * 30;
    if (h) {
      rows += `<rect x="12" y="${y}" width="296" height="26" rx="7" fill="rgba(45,106,74,0.22)" stroke="${E}"/>
      <circle cx="28" cy="${y + 13}" r="7" fill="${EM}"/>
      <rect x="42" y="${y + 7}" width="120" height="5" rx="2.5" fill="rgba(255,255,255,0.75)"/>
      <rect x="42" y="${y + 16}" width="80" height="4" rx="2" fill="rgba(255,255,255,0.35)"/>
      <rect x="250" y="${y + 8}" width="48" height="11" rx="5.5" fill="${E}"/>
      <text x="274" y="${y + 16.5}" fill="#08120c" font-size="8" font-weight="600" text-anchor="middle" font-family="Inter">ВЫШЕ</text>`;
    } else {
      rows += `<rect x="12" y="${y}" width="296" height="26" rx="7" fill="rgba(255,255,255,0.03)" stroke="${MUT}"/>
      <circle cx="28" cy="${y + 13}" r="7" fill="rgba(255,255,255,0.12)"/>
      <rect x="42" y="${y + 7}" width="110" height="5" rx="2.5" fill="rgba(255,255,255,0.22)"/>
      <rect x="42" y="${y + 16}" width="70" height="4" rx="2" fill="rgba(255,255,255,0.14)"/>`;
    }
  });
  return `<svg viewBox="0 0 320 138"><g font-family="Inter,sans-serif">${rows}</g></svg>`;
}
function illBadge() {
  return `<svg viewBox="0 0 320 150"><g font-family="Inter,sans-serif">
    <rect x="90" y="16" width="140" height="118" rx="14" fill="rgba(255,255,255,0.04)" stroke="${E}"/>
    <circle cx="160" cy="54" r="24" fill="${EM}"/>
    <text x="160" y="60" fill="#fff" font-size="18" font-weight="600" text-anchor="middle">АП</text>
    <rect x="118" y="86" width="84" height="6" rx="3" fill="rgba(255,255,255,0.6)"/>
    <rect x="128" y="99" width="64" height="5" rx="2.5" fill="rgba(255,255,255,0.3)"/>
    <rect x="112" y="112" width="96" height="15" rx="7.5" fill="${E}"/>
    <text x="160" y="122.5" fill="#08120c" font-size="9" font-weight="600" text-anchor="middle">★ PREMIUM</text>
  </g></svg>`;
}
function illStats() {
  const bars = [34, 52, 46, 70, 60, 84];
  let r = '';
  bars.forEach((h, i) => {
    const x = 40 + i * 42;
    r += `<rect x="${x}" y="${120 - h}" width="26" height="${h}" rx="5" fill="${i > 2 ? E : 'rgba(255,255,255,0.16)'}"/>`;
  });
  return `<svg viewBox="0 0 320 138"><g font-family="Inter,sans-serif"><line x1="30" y1="120" x2="300" y2="120" stroke="${MUT}"/>${r}<text x="160" y="18" fill="rgba(255,255,255,0.45)" font-size="11" text-anchor="middle">Просмотры анкеты по дням</text></g></svg>`;
}
function illVacancies() {
  return `<svg viewBox="0 0 320 150"><g font-family="Inter,sans-serif" text-anchor="middle">
    <rect x="10" y="30" width="92" height="92" rx="12" fill="rgba(255,255,255,0.03)" stroke="${MUT}"/>
    <text x="56" y="48" fill="rgba(255,255,255,0.45)" font-size="10">Старт</text>
    <text x="56" y="86" fill="#fff" font-size="26" font-weight="600">3</text>
    <text x="56" y="104" fill="rgba(255,255,255,0.4)" font-size="9.5">вакансии</text>
    <rect x="114" y="22" width="92" height="108" rx="12" fill="rgba(45,106,74,0.16)" stroke="${E}"/>
    <text x="160" y="42" fill="${E}" font-size="10">Бизнес</text>
    <text x="160" y="84" fill="#fff" font-size="28" font-weight="600">15</text>
    <text x="160" y="104" fill="rgba(255,255,255,0.5)" font-size="9.5">вакансий</text>
    <rect x="218" y="30" width="92" height="92" rx="12" fill="rgba(255,255,255,0.03)" stroke="${MUT}"/>
    <text x="264" y="48" fill="rgba(255,255,255,0.45)" font-size="10">Про</text>
    <text x="264" y="88" fill="#fff" font-size="30" font-weight="600">∞</text>
    <text x="264" y="104" fill="rgba(255,255,255,0.4)" font-size="9.5">безлимит</text>
  </g></svg>`;
}
function illInvites() {
  const arms = [0, 1, 2]
    .map((i) => {
      const y = 38 + i * 38;
      return `<line x1="72" y1="75" x2="210" y2="${y + 8}" stroke="${E}" stroke-width="2" stroke-dasharray="4 4"/><circle cx="226" cy="${y + 8}" r="13" fill="rgba(255,255,255,0.06)" stroke="${MUT2}"/><text x="226" y="${y + 12}" fill="rgba(255,255,255,0.7)" font-size="11" text-anchor="middle">👤</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 320 150"><g font-family="Inter,sans-serif">
    <circle cx="48" cy="75" r="22" fill="${EM}"/><text x="48" y="80" fill="#fff" font-size="16" text-anchor="middle">✉</text>
    <text x="48" y="116" fill="rgba(255,255,255,0.5)" font-size="10" text-anchor="middle">Вы</text>
    ${arms}
    <text x="250" y="79" fill="${E}" font-size="13" font-weight="600">+ ещё…</text>
    <text x="160" y="138" fill="rgba(255,255,255,0.4)" font-size="10.5" text-anchor="middle">Прямые приглашения нужным кандидатам</text>
  </g></svg>`;
}
function illVip() {
  const rows = [0, 1]
    .map((i) => {
      const y = 64 + i * 30;
      return `<rect x="14" y="${y}" width="292" height="24" rx="7" fill="rgba(255,255,255,0.03)" stroke="${MUT}"/><circle cx="32" cy="${y + 12}" r="8" fill="rgba(255,255,255,0.12)"/><rect x="48" y="${y + 6}" width="110" height="5" rx="2.5" fill="rgba(255,255,255,0.2)"/><rect x="48" y="${y + 15}" width="70" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>`;
    })
    .join('');
  return `<svg viewBox="0 0 320 150"><g font-family="Inter,sans-serif">
    <rect x="14" y="20" width="292" height="32" rx="8" fill="rgba(45,106,74,0.18)" stroke="${E}"/>
    <circle cx="34" cy="36" r="10" fill="${EM}"/>
    <rect x="52" y="29" width="120" height="6" rx="3" fill="rgba(255,255,255,0.7)"/>
    <rect x="52" y="40" width="80" height="5" rx="2.5" fill="rgba(255,255,255,0.35)"/>
    <rect x="236" y="28" width="58" height="16" rx="8" fill="${E}"/>
    <text x="265" y="39.5" fill="#08120c" font-size="9" font-weight="600" text-anchor="middle">VIP</text>
    ${rows}
    <text x="160" y="138" fill="rgba(255,255,255,0.4)" font-size="10.5" text-anchor="middle">Доступ к закрытым Vip-специалистам</text>
  </g></svg>`;
}
function illBoost() {
  return `<svg viewBox="0 0 320 150"><g font-family="Inter,sans-serif" text-anchor="middle">
    <circle cx="110" cy="66" r="40" fill="rgba(45,106,74,0.16)" stroke="${E}"/>
    <text x="110" y="78" font-size="34">🚀</text>
    <text x="110" y="124" fill="rgba(255,255,255,0.55)" font-size="11">Буст вакансии в топ</text>
    <rect x="178" y="40" width="128" height="52" rx="12" fill="rgba(255,255,255,0.04)" stroke="${E}"/>
    <circle cx="204" cy="66" r="14" fill="${EM}"/><text x="204" y="71" fill="#fff" font-size="14">✓</text>
    <text x="262" y="62" fill="#fff" font-size="11" font-weight="600">Проверенный</text>
    <text x="262" y="78" fill="rgba(255,255,255,0.5)" font-size="10">работодатель</text>
  </g></svg>`;
}
function illOverviewWorker() {
  return `<svg viewBox="0 0 320 150"><g font-family="Inter,sans-serif" text-anchor="middle">
    <rect x="16" y="20" width="135" height="110" rx="14" fill="rgba(255,255,255,0.03)" stroke="${MUT}"/>
    <text x="83" y="46" fill="rgba(255,255,255,0.55)" font-size="12">Бесплатно</text>
    <text x="83" y="82" fill="#fff" font-size="26" font-weight="600">0 ₽</text>
    <text x="83" y="104" fill="rgba(255,255,255,0.4)" font-size="10">базовый доступ</text>
    <rect x="169" y="14" width="135" height="122" rx="14" fill="rgba(45,106,74,0.16)" stroke="${E}"/>
    <rect x="206" y="6" width="62" height="16" rx="8" fill="${EM}"/><text x="237" y="17.5" fill="#fff" font-size="9" font-weight="600">Популярный</text>
    <text x="236" y="48" fill="${E}" font-size="12">Premium</text>
    <text x="236" y="84" fill="#fff" font-size="26" font-weight="600">290 ₽</text>
    <text x="236" y="106" fill="rgba(255,255,255,0.5)" font-size="10">в месяц</text>
  </g></svg>`;
}
function illOverviewEmployer() {
  return `<svg viewBox="0 0 320 150"><g font-family="Inter,sans-serif" text-anchor="middle">
    <rect x="8" y="34" width="96" height="84" rx="12" fill="rgba(255,255,255,0.03)" stroke="${MUT}"/>
    <text x="56" y="56" fill="rgba(255,255,255,0.5)" font-size="11">Старт</text>
    <text x="56" y="88" fill="#fff" font-size="20" font-weight="600">0 ₽</text>
    <rect x="112" y="20" width="96" height="112" rx="12" fill="rgba(45,106,74,0.16)" stroke="${E}"/>
    <rect x="130" y="12" width="60" height="15" rx="7.5" fill="${EM}"/><text x="160" y="23" fill="#fff" font-size="8.5" font-weight="600">Рекомендуем</text>
    <text x="160" y="48" fill="${E}" font-size="11">Бизнес</text>
    <text x="160" y="82" fill="#fff" font-size="19" font-weight="600">1990 ₽</text>
    <text x="160" y="104" fill="rgba(255,255,255,0.5)" font-size="9.5">в месяц</text>
    <rect x="216" y="34" width="96" height="84" rx="12" fill="rgba(255,255,255,0.03)" stroke="${MUT}"/>
    <text x="264" y="56" fill="rgba(255,255,255,0.5)" font-size="11">Про</text>
    <text x="264" y="88" fill="#fff" font-size="19" font-weight="600">4490 ₽</text>
  </g></svg>`;
}

// ─── Типы и данные слайдов ────────────────────────────────────────────────
interface CmpItem { plan: string; val: string; note?: string; best?: boolean; tag?: string }
interface Boost { price: string; per?: string; badge?: string; title: string; desc: string }
interface Slide {
  eyebrow: string;
  title: string;
  text: string;
  ill?: string;
  cmp?: { cols: 'two' | 'three'; items: CmpItem[] };
  boosts?: Boost[];
  final?: boolean;
  cta?: string;
}

const SLIDES: Record<Aud, Slide[]> = {
  worker: [
    { eyebrow: 'Обзор', title: 'Бесплатно или Premium', text: 'Базовый доступ бесплатен навсегда. Premium — всего 290 ₽ в месяц — снимает лимиты и поднимает вашу анкету в глазах работодателей.', ill: illOverviewWorker() },
    { eyebrow: 'Отклики', title: 'Откликайтесь без лимита', text: 'На бесплатном тарифе — 5 откликов в месяц. С Premium откликайтесь на любое число вакансий и не упускайте подходящие смены.', ill: illResponses(), cmp: { cols: 'two', items: [{ plan: 'Бесплатно', val: '5', note: 'в месяц' }, { plan: 'Premium', val: '∞', note: 'без лимита', best: true, tag: 'Premium' }] } },
    { eyebrow: 'Каталог', title: 'Выше и заметнее в каталоге', text: 'Анкета Premium выделяется цветом и поднимается выше в списке специалистов — работодатели видят вас первыми.', ill: illCatalog() },
    { eyebrow: 'Доверие', title: 'Бейдж «Premium» на анкете', text: 'Заметный бейдж и премиум-шаблон анкеты повышают доверие и отклик работодателей.', ill: illBadge() },
    { eyebrow: 'Аналитика', title: 'Статистика просмотров', text: 'Видите, сколько работодателей открывали вашу анкету и в какие дни — понимаете, что работает.', ill: illStats() },
    { eyebrow: 'Итог', title: 'Premium — 290 ₽ в месяц', text: 'Безлимит откликов, выделение в каталоге, бейдж и статистика. Плюс разовый буст на 3 дня в подарок при подключении.', ill: illOverviewWorker(), final: true, cta: 'Подключить Premium' },
  ],
  employer: [
    { eyebrow: 'Обзор', title: 'Три тарифа под ваш найм', text: 'Старт — бесплатно для проб. Бизнес (1990 ₽/мес) — для активного найма. Про (4490 ₽/мес) — безлимит и Vip-доступ для агентств.', ill: illOverviewEmployer() },
    { eyebrow: 'Вакансии', title: 'Больше активных вакансий', text: 'Сколько вакансий можно держать опубликованными одновременно. На Про — без ограничений.', ill: illVacancies(), cmp: { cols: 'three', items: [{ plan: 'Старт', val: '3' }, { plan: 'Бизнес', val: '15', best: true, tag: 'Рекомендуем' }, { plan: 'Про', val: '∞' }] } },
    { eyebrow: 'Приглашения', title: 'Приглашайте кандидатов сами', text: 'Прямые приглашения нужным специалистам в месяц. Не ждите откликов — выходите на людей первыми.', ill: illInvites(), cmp: { cols: 'three', items: [{ plan: 'Старт', val: '3' }, { plan: 'Бизнес', val: '30', best: true }, { plan: 'Про', val: '∞' }] } },
    { eyebrow: 'Каталог', title: 'Полный каталог + Vip-доступ', text: 'На платных тарифах открывается весь каталог и закрытые Vip-специалисты — лучшие исполнители города.', ill: illVip(), cmp: { cols: 'three', items: [{ plan: 'Старт', val: 'База', note: 'входящие' }, { plan: 'Бизнес', val: 'Vip', best: true }, { plan: 'Про', val: 'Vip' }] } },
    { eyebrow: 'Продвижение', title: 'Бусты вакансий и бейдж доверия', text: 'Бесплатные бусты в топ каждый месяц и бейдж «Проверенный работодатель» — больше откликов на ваши вакансии.', ill: illBoost(), cmp: { cols: 'three', items: [{ plan: 'Старт', val: '0', note: 'бустов' }, { plan: 'Бизнес', val: '1', note: 'буст/мес', best: true }, { plan: 'Про', val: '3', note: 'буста/мес' }] } },
    { eyebrow: 'Итог', title: 'Бизнес — 1990 ₽ в месяц', text: '15 вакансий, 30 приглашений, полный каталог с Vip, аналитика, бусты и бейдж доверия. Для агентств — Про с безлимитом.', ill: illOverviewEmployer(), final: true, cta: 'Подключить Бизнес' },
  ],
  services: [
    { eyebrow: 'Работодателям', title: 'Продвижение вакансий', text: 'Разовые услуги без смены тарифа — действуют сразу. Срочно нужен персонал? Поднимите конкретную вакансию в топ.', boosts: [
      { price: '490 ₽', per: '24 часа', title: 'Топ-буст на сутки', desc: 'Вакансия в топе каталога 24 часа. Для срочного найма.' },
      { price: '1 990 ₽', per: '7 дней', title: 'Топ-буст на неделю', desc: 'Вакансия в топе каталога целую неделю. Плановый найм.' },
      { price: '290 ₽', per: '7 дней', title: 'Выделение цветом', desc: 'Рамка и подсветка вакансии в каталоге — выше CTR.' },
      { price: '1 990 ₽', badge: 'Выгодно', title: 'Пакет «5 бустов»', desc: '5 топ-бустов на баланс. Применяйте к любым вакансиям.' },
    ] },
    { eyebrow: 'Специалистам', title: 'Продвижение анкеты', text: 'Быстрый эффект без месячной подписки — поднимите анкету в каталоге или снимите лимит откликов на время.', boosts: [
      { price: '149 ₽', per: '3 дня', title: 'Буст анкеты в топ', desc: 'Анкета в топе каталога категории на 3 дня.' },
      { price: '299 ₽', per: '7 дней', title: 'Буст анкеты в топ', desc: 'Анкета в топе категории на целую неделю.' },
      { price: '199 ₽', per: '1 месяц', title: 'Безлимитные отклики', desc: 'Отклики без ограничений на месяц без подписки.' },
      { price: '490 ₽', per: '30 дней', badge: 'Премиум', title: 'Бейдж «Рекомендован»', desc: 'Эксклюзивный бейдж платформы в каталоге на 30 дней.' },
    ] },
  ],
};

const HEAD_SUB: Record<Aud, string> = {
  employer: 'Что даёт платная подписка работодателю',
  worker: 'Что даёт Premium специалисту',
  services: 'Разовое продвижение без подписки',
};

const STYLE_ID = 'plan-comparison-modal-styles';
const CSS = `
.pcm-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,8,6,0.72);backdrop-filter:blur(4px);animation:pcm-fade .2s ease}
.pcm-popup{position:relative;width:100%;max-width:560px;max-height:calc(100vh - 32px);overflow:hidden;display:flex;flex-direction:column;border-radius:22px;border:1px solid rgba(255,255,255,0.1);background:linear-gradient(168deg,rgba(20,35,25,0.98),rgba(10,18,14,0.99));box-shadow:0 30px 80px rgba(0,0,0,0.55);font-family:'Inter',system-ui,sans-serif;animation:pcm-rise .25s ease}
.pcm-head{padding:20px 22px 0;display:flex;flex-direction:column;gap:16px}
.pcm-head-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.pcm-title{font-family:var(--font-playfair,'Playfair Display',serif);font-size:1.45rem;font-weight:600;line-height:1.2;color:#fff}
.pcm-sub{font-size:.8rem;color:rgba(255,255,255,0.4);margin-top:3px}
.pcm-close{flex:none;width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);font-size:18px;display:flex;align-items:center;justify-content:center;transition:.2s}
.pcm-close:hover{background:rgba(255,255,255,0.1);color:#fff}
.pcm-toggle{display:inline-flex;flex-wrap:wrap;gap:2px;padding:4px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);align-self:flex-start}
.pcm-toggle button{border:none;cursor:pointer;background:transparent;color:rgba(255,255,255,0.6);font:inherit;font-size:.84rem;font-weight:500;padding:8px 15px;border-radius:9px;transition:.2s;white-space:nowrap}
.pcm-toggle button.active{background:var(--u-gradient-primary,linear-gradient(135deg,#2d6a4a,#4fa76e));color:#fff;box-shadow:0 2px 10px rgba(45,106,74,0.35)}
.pcm-stage{overflow:hidden;touch-action:pan-y}
.pcm-track{display:flex;transition:transform .38s cubic-bezier(.4,0,.2,1)}
.pcm-slide{min-width:100%;padding:22px;display:flex;flex-direction:column;gap:16px}
.pcm-eyebrow{display:inline-flex;align-items:center;gap:7px;align-self:flex-start;font-size:.72rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#4fa76e;background:rgba(79,167,110,0.12);padding:6px 12px;border-radius:999px}
.pcm-slide-title{font-family:var(--font-playfair,'Playfair Display',serif);font-size:1.45rem;font-weight:600;line-height:1.25;color:#fff}
.pcm-text{font-size:.9rem;line-height:1.6;color:rgba(255,255,255,0.6)}
.pcm-ill{border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.025);padding:16px;display:flex;align-items:center;justify-content:center;min-height:150px}
.pcm-ill svg{width:100%;height:auto;display:block}
.pcm-cmp{display:grid;gap:10px}
.pcm-cmp.two{grid-template-columns:1fr 1fr}
.pcm-cmp.three{grid-template-columns:1fr 1fr 1fr}
.pcm-col{border-radius:13px;border:1px solid rgba(255,255,255,0.1);padding:12px;background:rgba(255,255,255,0.03);text-align:center;position:relative}
.pcm-col.best{border-color:rgba(79,167,110,0.55);background:linear-gradient(180deg,rgba(45,106,74,0.14),rgba(255,255,255,0.03))}
.pcm-plan{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:rgba(255,255,255,0.4)}
.pcm-col.best .pcm-plan{color:#4fa76e}
.pcm-val{font-family:var(--font-playfair,'Playfair Display',serif);font-size:1.4rem;font-weight:600;margin-top:4px;line-height:1.1;color:#fff}
.pcm-note{font-size:.72rem;color:rgba(255,255,255,0.4);margin-top:3px;min-height:1em}
.pcm-tag{position:absolute;top:-9px;left:50%;transform:translateX(-50%);font-size:.62rem;font-weight:600;color:#fff;background:#2d6a4a;padding:3px 9px;border-radius:999px;white-space:nowrap}
.pcm-blist{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pcm-bcard{border-radius:13px;border:1px solid rgba(255,255,255,0.1);padding:12px 13px;background:rgba(255,255,255,0.03);display:flex;flex-direction:column;gap:5px;position:relative}
.pcm-bcard.accent{border-color:rgba(79,167,110,0.45);background:linear-gradient(180deg,rgba(45,106,74,0.12),rgba(255,255,255,0.03))}
.pcm-bcard-top{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.pcm-bcard-price{font-family:var(--font-playfair,'Playfair Display',serif);font-size:1.15rem;font-weight:600;line-height:1;color:#fff}
.pcm-bcard-per{font-size:.7rem;color:rgba(255,255,255,0.4)}
.pcm-bcard-badge{position:absolute;top:-8px;right:10px;font-size:.6rem;font-weight:600;color:#fff;background:#2d6a4a;padding:2px 8px;border-radius:999px}
.pcm-bcard-title{font-size:.84rem;font-weight:600;line-height:1.25;color:#fff}
.pcm-bcard-desc{font-size:.74rem;line-height:1.45;color:rgba(255,255,255,0.4)}
.pcm-foot{padding:6px 22px 22px;display:flex;flex-direction:column;gap:16px}
.pcm-dots{display:flex;gap:7px;justify-content:center;align-items:center}
.pcm-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.18);border:none;padding:0;cursor:pointer;transition:.25s}
.pcm-dot.active{width:22px;border-radius:99px;background:#4fa76e}
.pcm-foot-row{display:flex;align-items:center;gap:10px}
.pcm-nav{flex:none;width:44px;height:44px;border-radius:12px;cursor:pointer;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;transition:.2s}
.pcm-nav:hover:not(:disabled){background:rgba(255,255,255,0.1)}
.pcm-nav:disabled{opacity:.3;cursor:default}
.pcm-cta{flex:1;border:none;cursor:pointer;border-radius:12px;padding:14px;font:inherit;font-size:.95rem;font-weight:600;color:#fff;background:var(--u-gradient-primary,linear-gradient(135deg,#2d6a4a,#4fa76e));transition:.2s;box-shadow:0 4px 18px rgba(45,106,74,0.35)}
.pcm-cta:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(45,106,74,0.5)}
.pcm-cta.ghost{background:transparent;border:1.5px solid rgba(255,255,255,0.28);color:rgba(255,255,255,0.9);box-shadow:none}
.pcm-cta.ghost:hover{border-color:rgba(255,255,255,0.5);transform:none}
@keyframes pcm-fade{from{opacity:0}to{opacity:1}}
@keyframes pcm-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:420px){.pcm-slide-title{font-size:1.25rem}.pcm-val{font-size:1.15rem}.pcm-blist{grid-template-columns:1fr}}
`;

function useInjectStyles() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

export function PlanComparisonModal({
  initialAudience = 'employer',
  onClose,
}: {
  initialAudience?: Aud;
  onClose: () => void;
}) {
  useInjectStyles();
  const [aud, setAud] = useState<Aud>(initialAudience);
  const [idx, setIdx] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  const list = SLIDES[aud];

  const go = useCallback((n: number) => {
    setIdx((cur) => {
      const max = SLIDES[aud].length - 1;
      return Math.max(0, Math.min(max, n)) === cur ? cur : Math.max(0, Math.min(max, n));
    });
  }, [aud]);

  const changeAud = (a: Aud) => { setAud(a); setIdx(0); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(SLIDES[aud].length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aud, onClose]);

  // блокируем прокрутку фона, пока попап открыт
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; dragging.current = true; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
  };

  const last = idx === list.length - 1;
  const slide = list[idx];
  const ctaGhost = !slide.final && !last;
  const ctaLabel = slide.final ? (slide.cta ?? 'Готово') : last ? (slide.cta ?? 'Готово') : 'Далее';

  const onCta = () => {
    if (!last) go(idx + 1);
    else onClose();
  };

  return (
    <div className="pcm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pcm-popup" role="dialog" aria-modal="true" aria-label="Сравнение тарифов">
        <div className="pcm-head">
          <div className="pcm-head-top">
            <div>
              <div className="pcm-title">Сравните тарифы</div>
              <div className="pcm-sub">{HEAD_SUB[aud]}</div>
            </div>
            <button className="pcm-close" aria-label="Закрыть" onClick={onClose}>&times;</button>
          </div>
          <div className="pcm-toggle" role="tablist">
            {(['employer', 'worker', 'services'] as Aud[]).map((a) => (
              <button
                key={a}
                role="tab"
                aria-selected={aud === a}
                className={aud === a ? 'active' : ''}
                onClick={() => changeAud(a)}
              >
                {a === 'employer' ? 'Работодателям' : a === 'worker' ? 'Специалистам' : 'Разовые услуги'}
              </button>
            ))}
          </div>
        </div>

        <div className="pcm-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="pcm-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
            {list.map((s, i) => (
              <div className="pcm-slide" key={`${aud}-${i}`}>
                <span className="pcm-eyebrow">{s.eyebrow}</span>
                <div className="pcm-slide-title">{s.title}</div>
                {s.boosts ? (
                  <div className="pcm-blist">
                    {s.boosts.map((b, bi) => (
                      <div className={`pcm-bcard${b.badge ? ' accent' : ''}`} key={bi}>
                        {b.badge && <span className="pcm-bcard-badge">{b.badge}</span>}
                        <div className="pcm-bcard-top">
                          <span className="pcm-bcard-price">{b.price}</span>
                          {b.per && <span className="pcm-bcard-per">/ {b.per}</span>}
                        </div>
                        <div className="pcm-bcard-title">{b.title}</div>
                        <div className="pcm-bcard-desc">{b.desc}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pcm-ill" dangerouslySetInnerHTML={{ __html: s.ill ?? '' }} />
                )}
                {s.cmp && (
                  <div className={`pcm-cmp ${s.cmp.cols}`}>
                    {s.cmp.items.map((it, ii) => (
                      <div className={`pcm-col${it.best ? ' best' : ''}`} key={ii}>
                        {it.tag && <span className="pcm-tag">{it.tag}</span>}
                        <div className="pcm-plan">{it.plan}</div>
                        <div className="pcm-val">{it.val}</div>
                        <div className="pcm-note">{it.note ?? ''}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pcm-text">{s.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pcm-foot">
          <div className="pcm-dots">
            {list.map((_, i) => (
              <button
                key={i}
                className={`pcm-dot${i === idx ? ' active' : ''}`}
                aria-label={`Слайд ${i + 1}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <div className="pcm-foot-row">
            <button className="pcm-nav" aria-label="Назад" disabled={idx === 0} onClick={() => go(idx - 1)}>&#8249;</button>
            <button className={`pcm-cta${ctaGhost ? ' ghost' : ''}`} onClick={onCta}>{ctaLabel}</button>
            <button className="pcm-nav" aria-label="Вперёд" disabled={last} onClick={() => go(idx + 1)}>&#8250;</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Кнопка-триггер: рендерит кнопку и управляет открытием попапа. */
export function ComparePlansButton({
  label = 'Посмотреть разницу наглядно',
  initialAudience = 'employer',
  className,
  variant = 'solid',
}: {
  label?: string;
  initialAudience?: Aud;
  className?: string;
  variant?: 'solid' | 'outline';
}) {
  const [open, setOpen] = useState(false);
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-semibold transition';
  const look =
    variant === 'solid'
      ? 'text-white hover:-translate-y-px'
      : 'border border-white/25 text-white/85 hover:border-white/50';
  const style = variant === 'solid' ? { background: 'var(--u-gradient-primary)' } : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? `${base} ${look}`}
        style={className ? undefined : style}
      >
        {label}
      </button>
      {open && <PlanComparisonModal initialAudience={initialAudience} onClose={() => setOpen(false)} />}
    </>
  );
}
