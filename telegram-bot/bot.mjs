import { describe, itemPhoto, newItems, parseRate, recordUrl, validDate } from './catalog.mjs';

const button = (text, callback_data) => ({ text, callback_data });
const webButton = (text, url) => ({ text, web_app: { url } });
const INTERVALS = [
  { hours: 0.25, label: 'Сразу · до 15 минут' },
  { hours: 24, label: 'Раз в день' },
  { hours: 168, label: 'Раз в неделю' },
];
const HOURS = INTERVALS.map((item) => item.hours);
const intervalLabel = (hours) => INTERVALS.find((item) => item.hours === hours)?.label || `каждые ${hours} ч`;
const APPLICATION_STATUS = {
  pending: 'ожидает ответа', viewed: 'просмотрен', invited: 'приглашение', interview: 'собеседование',
  confirmed: 'подтверждён', shift_started: 'смена началась', completed: 'завершён',
  cancelled: 'отменён', rejected: 'отклонён',
};
const applicationStatus = (status) => APPLICATION_STATUS[status] || status || 'без статуса';
export function createBot({ store, catalog, telegram, siteUrl, accountApi = null, now = Date.now }) {
  let categories = [];
  const send = (id, text, rows = []) => telegram('sendMessage', {
    chat_id: id, text, link_preview_options: { is_disabled: true },
    ...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}),
  });
  const cardRows = (user, item, position, total, mode = 'list') => {
    const rows = [];
    const nav = [];
    if (position > 0) nav.push(button('← Предыдущая', `${mode}:${position - 1}`));
    if (position + 1 < total) nav.push(button('Следующая →', `${mode}:${position + 1}`));
    if (nav.length) rows.push(nav);
    rows.push([{ text: user.role === 'worker' ? 'Подробнее о вакансии' : 'Открыть анкету', url: recordUrl(siteUrl, user, item) }]);
    rows.push([webButton('Открыть каталог', `${siteUrl.replace(/\/$/, '')}/telegram?role=${user.role}`)]);
    rows.push([button('🔔 Уведомления', 'notifications'), button('Меню', 'menu')]);
    return rows;
  };
  async function card(id, user, item, position, total, mode, message) {
    const caption = `${mode === 'digest' ? 'Новое по вашим фильтрам' : user.role === 'worker' ? 'Актуальная вакансия' : 'Профиль работника'} · ${position + 1} из ${total}\n\n${describe(user, item, categories)}`;
    const data = {
      chat_id: id,
      media: { type: 'photo', media: itemPhoto(siteUrl, user, item), caption },
      reply_markup: { inline_keyboard: cardRows(user, item, position, total, mode) },
    };
    if (message?.message_id && message.photo) {
      return telegram('editMessageMedia', { ...data, message_id: message.message_id });
    }
    return telegram('sendPhoto', { chat_id: id, photo: data.media.media, caption, reply_markup: data.reply_markup });
  }
  async function menu(id, user) {
    if (!user.role) return send(id, 'Добро пожаловать в Юнити! Выберите, чем бот может помочь:', [
      [button('Я работник — ищу работу', 'role:worker')],
      [button('Я работодатель — ищу персонал', 'role:employer')],
    ]);
    const city = user.cityId ? (await catalog.options('cities')).find((c) => c.id === user.cityId)?.name || 'Выбранный город' : 'Все города';
    const category = categories.find((c) => c.id === user.category)?.name || 'Все специальности';
    return send(id, [user.role === 'worker' ? 'Вы ищете вакансии' : 'Вы ищете работников',
      `${category} · ${city}`, user.rateMax !== undefined ? `Ставка: ${user.rateMin}–${user.rateMax} ₽` : 'Ставка: любая',
      user.date ? `Дата: ${user.date}` : 'Дата: любая',
      user.enabled ? `Уведомления: ${intervalLabel(user.hours)}` : 'Уведомления выключены'].join('\n'), [
      [webButton(user.role === 'worker' ? 'Открыть каталог вакансий' : 'Открыть каталог работников', `${siteUrl.replace(/\/$/, '')}/telegram?role=${user.role}`)],
      [button('Смотреть карточки в чате', 'list:0')],
      [button('Специальность', 'categories:0'), button('Город', 'cities:0')],
      [button('Ставка', 'rate'), button('Дата', 'date')],
      [button('🔔 Настроить уведомления', 'notifications')],
      [button('👤 Мой аккаунт Unity', 'account')],
      [button('Помощь', 'help'), button('Сменить роль', 'role')],
    ]);
  }

  function help(id, user) {
    return send(id, [
      'Как пользоваться ботом:',
      '• откройте каталог и настройте фильтры;',
      '• включите уведомления — пришлём только новые предложения;',
      '• свяжите аккаунт Unity, чтобы получать ответы, приглашения и сообщения;',
      '• изменить роль и фильтры можно в меню.',
      '',
      'Если что-то не открывается, нажмите «Меню» и повторите действие.',
    ].join('\n'), [
      [webButton('Открыть каталог', `${siteUrl.replace(/\/$/, '')}/telegram?role=${user.role || 'worker'}`)],
      [button('Мой аккаунт', 'account'), button('Меню', 'menu')],
    ]);
  }

  function accountLinks(role) {
    const root = siteUrl.replace(/\/$/, '');
    const prefix = role === 'employer' ? '/employer' : '/worker';
    return [
      [{ text: role === 'employer' ? 'Все отклики' : 'Мои отклики', url: `${root}${prefix}/applications` },
        { text: 'Приглашения', url: `${root}${prefix}/invitations` }],
      [{ text: 'Сообщения', url: `${root}${prefix}/messages` }, { text: 'Смены', url: `${root}${prefix}/shifts` }],
    ];
  }

  function notificationPath(role, type) {
    const prefix = role === 'employer' ? '/employer' : '/worker';
    if (type === 'NEW_CHAT_MESSAGE') return `${prefix}/messages`;
    if (['INVITATION', 'APPLICATION_RECEIVED', 'APPLICATION_RESPONSE'].includes(type)) {
      return type === 'INVITATION' ? `${prefix}/invitations` : `${prefix}/applications`;
    }
    if (String(type || '').startsWith('SHIFT_') || String(type || '').startsWith('PAYMENT_')) return `${prefix}/shifts`;
    return `${prefix}/notifications`;
  }

  async function accountSummary(id, user) {
    if (!accountApi) return send(id, 'Связь с аккаунтом временно недоступна.', [[button('Меню', 'menu')]]);
    try {
      const summary = await accountApi(`summary?chatId=${encodeURIComponent(id)}`);
      user.siteLinked = true;
      const counts = summary.counts || {};
      const lines = [
        `Аккаунт Unity: ${summary.displayName}`,
        summary.role === 'worker' ? 'Роль: работник' : summary.role === 'employer' ? 'Роль: работодатель' : null,
        `Отклики: ${counts.applications || 0}`,
        `Приглашения: ${counts.invitations || 0}`,
        `Активные смены: ${counts.shifts || 0}`,
        `Непрочитанные сообщения: ${counts.unreadMessages || 0}`,
      ].filter(Boolean);
      if (summary.applications?.length) {
        lines.push('', 'Последние отклики:');
        for (const application of summary.applications.slice(0, 5)) {
          const person = application.worker
            ? ` · ${application.worker.firstName || ''} ${application.worker.lastName || ''}`.trimEnd()
            : '';
          lines.push(`• ${application.vacancy?.title || 'Вакансия'}${person} — ${applicationStatus(application.status)}`);
        }
      }
      user.siteSeenNotificationIds ??= (summary.notifications || []).map((item) => item.id);
      await store.save();
      const cabinet = summary.role === 'employer' ? '/employer/applications' : '/worker/applications';
      return send(id, lines.join('\n'), [
        ...accountLinks(summary.role),
        [{ text: 'Открыть личный кабинет', url: `${siteUrl.replace(/\/$/, '')}${cabinet}` }],
        [button(user.accountNotifications === false ? 'Включить личные уведомления' : 'Выключить личные уведомления', 'account-notifications')],
        [button('Обновить', 'account'), button('Отключить аккаунт', 'account-unlink-confirm')],
        [button('Меню', 'menu')],
      ]);
    } catch (error) {
      if (error.code !== 'NOT_LINKED' && error.code !== 404) throw error;
      user.siteLinked = false;
      await store.save();
      const settingsPath = user.role === 'employer' ? '/employer/settings' : '/worker/settings';
      return send(id, 'Свяжите Telegram с аккаунтом Unity:\n1. Откройте настройки на сайте.\n2. Нажмите «Подключить Telegram».\n3. Отправьте сюда полученный 8-значный код.', [
        [{ text: 'Получить код на сайте', url: `${siteUrl.replace(/\/$/, '')}${settingsPath}` }],
        [button('Меню', 'menu')],
      ]);
    }
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
    const onboarding = (kind === 'categories' && user.onboarding === 'category') ||
      (kind === 'cities' && user.onboarding === 'city');
    const choicePrefix = onboarding
      ? (kind === 'categories' ? 'oncat' : 'oncity')
      : (kind === 'categories' ? 'cat' : 'city');
    const rows = all.slice(start, start + 8).map((item) => [button(item.name, `${choicePrefix}:${item.id}`)]);
    const nav = [];
    if (page > 0) nav.push(button('← Назад', `${kind}:${page - 1}`));
    if (start + 8 < all.length) nav.push(button('Далее →', `${kind}:${page + 1}`));
    if (nav.length) rows.push(nav);
    rows.push([button(kind === 'categories' ? 'Все специальности' : 'Все города', `${choicePrefix}:all`), button('Меню', 'menu')]);
    const title = kind === 'categories'
      ? (user.role === 'worker' ? 'Кем хотите работать?' : 'Какие специалисты вам нужны?')
      : (user.role === 'worker' ? 'В каком городе ищете работу?' : 'В каком городе ищете персонал?');
    return send(id, title, rows);
  }
  async function listing(id, user, position, message) {
    const result = await catalog.page(user, position + 1, 1);
    if (!result.data.length) return send(id, 'По этим фильтрам пока ничего нет. Включите уведомления — сообщим, когда появится подходящее предложение.', [
      [button('🔔 Включить уведомления', 'notifications')], [button('Изменить фильтры', 'menu')],
    ]);
    return card(id, user, result.data[0], position, result.meta.totalPages, 'list', message);
  }
  async function digestCard(id, user, position, message) {
    const items = await catalog.all(user);
    const byId = new Map(items.map((item) => [item.id, item]));
    const digestItems = (user.lastDigestIds || []).map((itemId) => byId.get(itemId)).filter(Boolean);
    if (!digestItems.length) return send(id, 'Эта подборка уже неактуальна. Покажу свежие предложения.', [[button('Смотреть актуальные', 'list:0')]]);
    const safePosition = Math.min(Math.max(0, position), digestItems.length - 1);
    return card(id, user, digestItems[safePosition], safePosition, digestItems.length, 'digest', message);
  }
  async function notifications(id, user) {
    return send(id, `Включить уведомления о новых ${user.role === 'worker' ? 'вакансиях' : 'работниках'} по выбранным фильтрам? Пустых и повторных сообщений не будет.`, [
      ...INTERVALS.map(({ hours, label }) => [button(label, `subscribe:${hours}`)]),
      user.onboarding === 'notifications'
        ? [button('Не сейчас', 'skip-notifications')]
        : [button('Выключить', 'stop'), button('Меню', 'menu')],
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
        user.enabled = false; user.pending = undefined; user.onboarding = undefined;
        user.notificationsDeclinedAt = new Date(now()).toISOString();
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
        store.state.users[id] = { role, enabled: false, hours: 24, seen: [], onboarding: 'category', onboardingVersion: 2 };
        await store.save();
        return options(id, store.state.users[id], 'categories', 0);
      }
      if (action === 'role') return menu(id, {});
      if (!user.role) return menu(id, user);
      if (!action && /^\/start(?:@\w+)?$/.test(text) && user.onboardingVersion !== 2) {
        user.onboardingVersion = 2;
        await store.save();
        if (!user.enabled) return notifications(id, user);
      }
      if ((!action && /^\/(start|menu)(?:@\w+)?$/.test(text)) || action === 'menu') {
        user.pending = undefined; await store.save();
        return menu(id, user);
      }
      if (action === 'help' || (!action && /^\/help(?:@\w+)?$/.test(text))) return help(id, user);
      if (action === 'account') return accountSummary(id, user);
      if (action === 'account-notifications') {
        user.accountNotifications = user.accountNotifications === false;
        await store.save();
        await send(id, user.accountNotifications ? 'Личные уведомления включены.' : 'Личные уведомления выключены. Уведомления о новых вакансиях настраиваются отдельно.');
        return accountSummary(id, user);
      }
      if (action === 'account-unlink-confirm') {
        return send(id, 'Отключить Telegram от аккаунта Unity? Уведомления о вакансиях останутся доступными.', [
          [button('Да, отключить', 'account-unlink'), button('Отмена', 'account')],
        ]);
      }
      if (action === 'account-unlink') {
        if (accountApi) await accountApi('disconnect', { method: 'POST', body: { chatId: id } });
        Object.assign(user, { siteLinked: false, accountNotifications: false, siteSeenNotificationIds: [] });
        await store.save();
        return send(id, 'Аккаунт Unity отключён от Telegram.', [[button('Меню', 'menu')]]);
      }
      if (!action && /^[A-Z2-9]{8}$/i.test(text)) {
        if (!accountApi) return send(id, 'Связь с аккаунтом временно недоступна. Попробуйте позже.');
        try {
          const linked = await accountApi('connect', { method: 'POST', body: {
            code: text.toUpperCase(), chatId: id,
            username: update.message?.from?.username || update.callback_query?.from?.username || null,
          } });
          Object.assign(user, { siteLinked: true, accountNotifications: true });
          delete user.siteSeenNotificationIds;
          await store.save();
          await send(id, `Готово! Telegram связан с аккаунтом ${linked.displayName}. Личные уведомления включены.`);
          return accountSummary(id, user);
        } catch (error) {
          if (error.code === 'INVALID_LINK_CODE' || error.code === 400) {
            return send(id, 'Код неверный или уже истёк. Создайте новый код в настройках Unity.', [[button('Мой аккаунт', 'account')]]);
          }
          throw error;
        }
      }
      if (action.startsWith('list:')) {
        const position = Number(action.slice(5));
        if (Number.isSafeInteger(position) && position >= 0 && position <= 100_000) return listing(id, user, position, message);
        return;
      }
      if (action.startsWith('digest:')) {
        const position = Number(action.slice(7));
        if (Number.isSafeInteger(position) && position >= 0 && position <= 100) return digestCard(id, user, position, message);
        return;
      }
      for (const kind of ['categories', 'cities']) {
        if (action.startsWith(`${kind}:`)) {
          const page = Number(action.split(':')[1]);
          if (Number.isSafeInteger(page) && page >= 0 && page <= 100_000) return options(id, user, kind, page);
          return;
        }
      }
      if (action.startsWith('oncat:') || action.startsWith('oncity:')) {
        const isCity = action.startsWith('oncity:');
        const value = action.split(':')[1];
        const choices = isCity ? await catalog.options('cities') : categories;
        if (value !== 'all' && !choices.some((c) => c.id === value)) return send(id, 'Этот вариант уже недоступен. Попробуйте выбрать снова.', [[button('Меню', 'menu')]]);
        user[isCity ? 'cityId' : 'category'] = value === 'all' ? undefined : value;
        user.onboarding = isCity ? 'notifications' : 'city';
        await store.save();
        return isCity ? notifications(id, user) : options(id, user, 'cities', 0);
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
      if (action === 'notifications' || (!action && /^\/notifications(?:@\w+)?$/.test(text))) return notifications(id, user);
      if (action === 'skip-notifications') {
        Object.assign(user, { enabled: false, onboarding: undefined, notificationsDeclinedAt: new Date(now()).toISOString() });
        await store.save();
        await send(id, 'Хорошо, уведомления не включены. Их можно включить позже через меню.');
        return menu(id, user);
      }
      if (action.startsWith('subscribe:')) {
        const hours = Number(action.split(':')[1]);
        if (!HOURS.includes(hours)) return;
        const seen = (await catalog.all(user)).map((item) => item.id);
        Object.assign(user, { enabled: true, hours, seen, nextAt: now() + hours * 3_600_000, pending: undefined,
          onboarding: undefined, notificationsConsentAt: new Date(now()).toISOString(), notificationsDeclinedAt: undefined });
        await store.save();
        await send(id, `Уведомления включены: ${intervalLabel(hours)}. Пришлём только новые подходящие предложения.`);
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
      const stats = { processed: 0, sent: 0, disabled: 0, errors: 0 };
      for (const [id, user] of Object.entries(store.state.users)) {
        if (!user.enabled || !user.role || user.nextAt > now()) continue;
        // Bound each batch so polling still processes /stop and interactive searches.
        if (processed++ >= 10) break;
        stats.processed++;
        try {
          const items = await catalog.all(user);
          const fresh = newItems(items, user.seen).slice(0, 5);
          if (fresh.length) {
            user.lastDigestIds = fresh.map((item) => item.id);
            await card(id, user, fresh[0], 0, fresh.length, 'digest');
            stats.sent++;
            user.seen = [...new Set([...user.seen, ...fresh.map((item) => item.id)])];
          }
          user.nextAt = now() + user.hours * 3_600_000;
          await store.save();
        } catch (error) {
          if (error.code === 'BOT_STORAGE') throw error;
          stats.errors++;
          if (error.code === 403) { user.enabled = false; stats.disabled++; }
          else user.nextAt = now() + Math.max(300, error.retryAfter || 0) * 1000;
          await store.save();
          // Do not print tokens, chat IDs, profile data or request URLs.
          console.error('Digest delivery deferred; code:', error.code || 'network/catalog');
        }
      }
      return stats;
    },
    async accountDigest() {
      const stats = { processed: 0, sent: 0, disconnected: 0, errors: 0 };
      if (!accountApi) return stats;
      let processed = 0;
      for (const [id, user] of Object.entries(store.state.users)) {
        if (!user.siteLinked || user.accountNotifications === false) continue;
        if (processed++ >= 20) break;
        stats.processed++;
        try {
          const summary = await accountApi(`summary?chatId=${encodeURIComponent(id)}`);
          const seen = new Set(user.siteSeenNotificationIds || []);
          const fresh = (summary.notifications || []).filter((item) => !seen.has(item.id)).reverse().slice(0, 3);
          for (const notification of fresh) {
            const target = `${siteUrl.replace(/\/$/, '')}${notificationPath(summary.role, notification.type)}`;
            await send(id, `${notification.title}\n\n${notification.body}`, [
              [{ text: 'Посмотреть на сайте', url: target }],
              [button('Мой аккаунт', 'account'), button('Меню', 'menu')],
            ]);
            seen.add(notification.id);
            stats.sent++;
          }
          user.siteSeenNotificationIds = [...seen].slice(-100);
          await store.save();
        } catch (error) {
          if (error.code === 'NOT_LINKED' || error.code === 404) {
            user.siteLinked = false;
            stats.disconnected++;
            await store.save();
          } else {
            stats.errors++;
            console.error('Account notification delivery deferred; code:', error.code || 'network');
          }
        }
      }
      return stats;
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
