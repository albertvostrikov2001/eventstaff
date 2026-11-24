import { describe, newItems, parseRate, recordUrl, validDate } from './catalog.mjs';

const button = (text, callback_data) => ({ text, callback_data });
const HOURS = [12, 24, 168];
export function createBot({ store, catalog, telegram, siteUrl, now = Date.now }) {
  let categories = [];
  const send = (id, text, rows = []) => telegram('sendMessage', {
    chat_id: id, text, link_preview_options: { is_disabled: true },
    ...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}),
  });
  async function menu(id, user) {
    if (!user.role) return send(id, 'Добро пожаловать в Юнити! Кого вы ищете?', [
      [button('Я работник — ищу работу', 'role:worker')],
      [button('Я работодатель — ищу персонал', 'role:employer')],
    ]);
    const city = user.cityId ? (await catalog.options('cities')).find((c) => c.id === user.cityId)?.name || 'Выбранный город' : 'Все города';
    const category = categories.find((c) => c.id === user.category)?.name || 'Все специальности';
    return send(id, [user.role === 'worker' ? 'Вы ищете вакансии' : 'Вы ищете работников',
      `${category} · ${city}`, user.rateMax !== undefined ? `Ставка: ${user.rateMin}–${user.rateMax} ₽` : 'Ставка: любая',
      user.date ? `Дата: ${user.date}` : 'Дата: любая',
      user.enabled ? `Рассылка: каждые ${user.hours} ч` : 'Рассылка выключена'].join('\n'), [
      [button('Показать актуальные', 'list:1')],
      [button('Специальность', 'categories:0'), button('Город', 'cities:0')],
      [button('Ставка', 'rate'), button('Дата', 'date')],
      [button('Уведомления', 'notifications')],
      [button('Сменить роль', 'role')],
    ]);
  }
  async function rebaseline(user) {
    if (user.enabled) {
      user.seen = (await catalog.all(user)).map((item) => item.id);
      user.nextAt = now() + user.hours * 3_600_000;
    }
  }
  async function change(id, user, values) {
    // Build a candidate first: a failed API request must not erase subscription state.
    const candidate = { ...user, ...values, pending: undefined };
    await rebaseline(candidate);
    store.state.users[id] = candidate;
    await store.save();
    return menu(id, candidate);
  }
  async function options(id, user, kind, page) {
    const all = kind === 'categories' ? categories : await catalog.options('cities');
    const start = page * 8;
    const rows = all.slice(start, start + 8).map((item) => [button(item.name, `${kind === 'categories' ? 'cat' : 'city'}:${item.id}`)]);
    const nav = [];
    if (page > 0) nav.push(button('← Назад', `${kind}:${page - 1}`));
    if (start + 8 < all.length) nav.push(button('Далее →', `${kind}:${page + 1}`));
    if (nav.length) rows.push(nav);
    rows.push([button('Все', kind === 'categories' ? 'cat:all' : 'city:all'), button('Меню', 'menu')]);
    return send(id, kind === 'categories' ? 'Выберите специальность' : 'Выберите город', rows);
  }
  async function listing(id, user, page) {
    const result = await catalog.page(user, page);
    if (!result.data.length) return send(id, 'По этим фильтрам пока ничего нет. Измените фильтры или включите уведомления.', [[button('Меню', 'menu')]]);
    for (const item of result.data) await send(id, describe(user, item, categories), [[{ text: 'Открыть на сайте', url: recordUrl(siteUrl, user, item) }]]);
    const nav = [];
    if (page > 1) nav.push(button('← Назад', `list:${page - 1}`));
    if (page < result.meta.totalPages) nav.push(button('Далее →', `list:${page + 1}`));
    return send(id, `Страница ${page} из ${result.meta.totalPages}. Данные получены с сайта сейчас.`, [nav, [button('Обновить', `list:${page}`), button('Меню', 'menu')]].filter((row) => row.length));
  }
  async function notifications(id, user) {
    return send(id, 'Присылать только новые вакансии или анкеты по вашим фильтрам? После изменения фильтров отсчёт начинается заново. Пустых подборок не будет.', [
      ...HOURS.map((hours) => [button(hours === 168 ? 'Раз в неделю' : hours === 24 ? 'Раз в день' : 'Два раза в день', `subscribe:${hours}`)]),
      [button('Выключить', 'stop'), button('Меню', 'menu')],
    ]);
  }
  return {
    async init() { categories = await catalog.options('categories'); },
    async handle(update) {
      const message = update.message || update.callback_query?.message;
      if (!message || message.chat.type !== 'private') return;
      const id = String(message.chat.id);
      if (update.callback_query) {
        try { await telegram('answerCallbackQuery', { callback_query_id: update.callback_query.id }); }
        catch { /* An expired callback should not prevent the action. */ }
      }
      let user = store.state.users[id];
      if (!user) {
        user = { enabled: false, hours: 24, seen: [] };
        store.state.users[id] = user;
        await store.save();
      }
      const text = message.text?.trim() || '';
      const action = update.callback_query?.data || '';
      if ((!action && /^\/stop(?:@\w+)?$/.test(text)) || action === 'stop') {
        user.enabled = false; user.pending = undefined;
        await store.save();
        return send(id, 'Уведомления выключены.', [[button('Меню', 'menu')]]);
      }
      if (!action && /^\/delete(?:@\w+)?$/.test(text)) {
        delete store.state.users[id];
        await store.save();
        return send(id, 'Настройки и подписка удалены. Для нового начала: /start');
      }
      if (action.startsWith('role:')) {
        const role = action.slice(5);
        if (!['worker', 'employer'].includes(role)) return;
        store.state.users[id] = { role, enabled: false, hours: 24, seen: [] };
        await store.save();
        return menu(id, store.state.users[id]);
      }
      if (action === 'role') return menu(id, {});
      if (!user.role) return menu(id, user);
      if ((!action && /^\/(start|menu|help)(?:@\w+)?$/.test(text)) || action === 'menu') {
        user.pending = undefined; await store.save();
        return menu(id, user);
      }
      if (action.startsWith('list:')) {
        const page = Number(action.slice(5));
        if (Number.isSafeInteger(page) && page > 0 && page <= 100_000) return listing(id, user, page);
        return;
      }
      for (const kind of ['categories', 'cities']) {
        if (action.startsWith(`${kind}:`)) {
          const page = Number(action.split(':')[1]);
          if (Number.isSafeInteger(page) && page >= 0 && page <= 100_000) return options(id, user, kind, page);
          return;
        }
      }
      if (action.startsWith('cat:') || action.startsWith('city:')) {
        const isCity = action.startsWith('city:');
        const value = action.split(':')[1];
        const choices = isCity ? await catalog.options('cities') : categories;
        if (value !== 'all' && !choices.some((c) => c.id === value)) return send(id, 'Этот фильтр уже недоступен. Откройте меню.', [[button('Меню', 'menu')]]);
        return change(id, user, { [isCity ? 'cityId' : 'category']: value === 'all' ? undefined : value });
      }
      if (action === 'rate' || action === 'date') {
        user.pending = action; await store.save();
        return send(id, action === 'rate'
          ? 'Введите минимум и максимум через пробел, например: 2000 5000. Учитывайте единицу оплаты в карточке: смена или месяц. Для сброса: «любая».'
          : 'Введите дату в формате ГГГГ-ММ-ДД. Для работников ищем свободных в этот день, для вакансий — дату начала смены. Для сброса: «любая».', [[button('Меню', 'menu')]]);
      }
      if (action === 'notifications') return notifications(id, user);
      if (action.startsWith('subscribe:')) {
        const hours = Number(action.split(':')[1]);
        if (!HOURS.includes(hours)) return;
        const seen = (await catalog.all(user)).map((item) => item.id);
        Object.assign(user, { enabled: true, hours, seen, nextAt: now() + hours * 3_600_000, pending: undefined });
        await store.save();
        await send(id, 'Уведомления включены. Будем присылать новые записи, появившиеся после подписки. Текущие можно посмотреть кнопкой «Показать актуальные».');
        return menu(id, user);
      }
      if (!action && user.pending === 'rate') {
        if (text.toLowerCase() === 'любая') return change(id, user, { rateMin: undefined, rateMax: undefined });
        const range = parseRate(text);
        if (!range) return send(id, 'Нужны два числа: минимум и максимум, например 2000 5000.');
        return change(id, user, range);
      }
      if (!action && user.pending === 'date') {
        if (text.toLowerCase() === 'любая') return change(id, user, { date: undefined });
        if (!validDate(text)) return send(id, 'Проверьте дату. Пример: 2026-12-25.');
        return change(id, user, { date: text });
      }
      return menu(id, user);
    },
    async digest() {
      let processed = 0;
      for (const [id, user] of Object.entries(store.state.users)) {
        if (!user.enabled || !user.role || user.nextAt > now()) continue;
        // Bound each batch so polling still processes /stop and interactive searches.
        if (processed++ >= 10) break;
        try {
          const items = await catalog.all(user);
          const fresh = newItems(items, user.seen).slice(0, 5);
          if (fresh.length) {
            const text = ['Новое по вашим фильтрам в Юнити:', ...fresh.map((item, i) => `${i + 1}. ${describe(user, item, categories)}`)].join('\n\n');
            await send(id, text, [...fresh.map((item, i) => [{ text: `Открыть ${i + 1} на сайте`, url: recordUrl(siteUrl, user, item) }]), [button('Все актуальные', 'list:1'), button('Выключить', 'stop')]]);
            user.seen = [...new Set([...user.seen, ...fresh.map((item) => item.id)])];
          }
          user.nextAt = now() + user.hours * 3_600_000;
          await store.save();
        } catch (error) {
          if (error.code === 'BOT_STORAGE') throw error;
          if (error.code === 403) user.enabled = false;
          else user.nextAt = now() + Math.max(300, error.retryAfter || 0) * 1000;
          await store.save();
          // Do not print tokens, chat IDs, profile data or request URLs.
          console.error('Digest delivery deferred; code:', error.code || 'network/catalog');
        }
      }
    },
    async failure(update) {
      const chat = update.message?.chat || update.callback_query?.message?.chat;
      if (chat?.type === 'private') {
        try { await send(chat.id, 'Сервис временно недоступен. Попробуйте ещё раз немного позже.', [[button('Меню', 'menu')]]); }
        catch { /* The user may have blocked the bot. */ }
      }
    },
  };
}
