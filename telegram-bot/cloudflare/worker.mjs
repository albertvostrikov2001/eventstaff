import { createBot } from '../bot.mjs';
import { createCatalog } from '../catalog.mjs';
import { openKvStore } from './kv-store.mjs';

function assertConfig(env) {
  for (const key of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'ADMIN_SETUP_SECRET', 'UNITY_API_URL', 'UNITY_SITE_URL']) {
    if (!env[key]) throw new Error(`Missing ${key}`);
  }
}

function createTelegram(token) {
  return async (method, data = {}) => {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      const error = new Error(`Telegram API ${body?.error_code || response.status}`);
      error.code = body?.error_code || response.status;
      error.retryAfter = body?.parameters?.retry_after;
      throw error;
    }
    return body.result;
  };
}

async function runtime(env) {
  assertConfig(env);
  const store = await openKvStore(env.BOT_STATE);
  const telegram = createTelegram(env.TELEGRAM_BOT_TOKEN);
  const bot = createBot({
    store,
    telegram,
    catalog: createCatalog(env.UNITY_API_URL),
    siteUrl: env.UNITY_SITE_URL,
  });
  await bot.init();
  return { bot, store, telegram };
}

async function setup(request, env) {
  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${env.ADMIN_SETUP_SECRET}`) return new Response('Forbidden', { status: 403 });
  const { telegram } = await runtime(env);
  const webhookUrl = new URL('/telegram', request.url).href;
  await telegram('setWebhook', {
    url: webhookUrl,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
    max_connections: 1,
    drop_pending_updates: false,
  });
  await telegram('setMyCommands', { commands: [
    { command: 'start', description: 'Начать / открыть меню' },
    { command: 'menu', description: 'Поиск и фильтры' },
    { command: 'notifications', description: 'Настроить уведомления' },
    { command: 'stop', description: 'Выключить уведомления' },
    { command: 'delete', description: 'Удалить настройки и подписку' },
  ] });
  const identity = await telegram('getMe');
  return Response.json({ ok: true, bot: identity.username, webhook: webhookUrl });
}

async function webhook(request, env) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Forbidden', { status: 403 });
  }
  const update = await request.json();
  const { bot, store } = await runtime(env);
  if (Number.isSafeInteger(update.update_id) && update.update_id < store.state.offset) {
    return Response.json({ ok: true, duplicate: true });
  }
  await bot.handle(update);
  if (Number.isSafeInteger(update.update_id)) {
    store.state.offset = update.update_id + 1;
    await store.save();
  }
  return Response.json({ ok: true });
}

export default {
  async fetch(request, env) {
    try {
      assertConfig(env);
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/') {
        return Response.json({ ok: true, service: 'unity-telegram-bot' });
      }
      if (request.method === 'POST' && url.pathname === '/setup') return setup(request, env);
      if (request.method === 'POST' && url.pathname === '/telegram') return webhook(request, env);
      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('Worker request failed', error?.code || error?.name || 'error');
      return Response.json({ ok: false }, { status: 500 });
    }
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const { bot } = await runtime(env);
        await bot.digest();
      } catch (error) {
        console.error('Scheduled digest failed', error?.code || error?.name || 'error');
      }
    })());
  },
};
