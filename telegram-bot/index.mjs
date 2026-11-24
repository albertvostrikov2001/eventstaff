import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createCatalog } from './catalog.mjs';
import { createTelegram } from './telegram.mjs';
import { openStore } from './store.mjs';
import { createBot } from './bot.mjs';

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in the bot environment');
  const apiUrl = process.env.UNITY_API_URL?.trim();
  const siteUrl = process.env.UNITY_SITE_URL?.trim();
  for (const value of [apiUrl, siteUrl]) {
    if (!value || !['http:', 'https:'].includes(new URL(value).protocol)) throw new Error('Set valid UNITY_API_URL and UNITY_SITE_URL');
  }
  const telegram = createTelegram(token);
  console.log('Checking Telegram webhook');
  const webhook = await telegram('getWebhookInfo');
  if (webhook.url) throw new Error('Bot already has a webhook. Use a separate bot or remove its webhook explicitly');
  await telegram('getMe');
  console.log('Telegram identity verified');
  const store = await openStore(resolve(process.env.TELEGRAM_STATE_DIR || 'telegram-bot/data'));
  let running = true;
  const stop = () => { running = false; };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  try {
    const bot = createBot({ store, catalog: createCatalog(apiUrl), telegram, siteUrl });
    await bot.init();
    await telegram('setMyCommands', { commands: [
      { command: 'start', description: 'Начать / открыть меню' },
      { command: 'menu', description: 'Поиск и фильтры' },
      { command: 'stop', description: 'Выключить уведомления' },
      { command: 'delete', description: 'Удалить настройки и подписку' },
    ] });
    console.log('Unity Telegram bot started');
    let digestAt = 0;
    while (running) {
      try {
        const updates = await telegram('getUpdates', { offset: store.state.offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
        for (const update of updates) {
          try { await bot.handle(update); }
          catch (error) {
            if (error.code === 'BOT_STORAGE') throw error;
            console.error('Bot action failed; code:', error.code || 'network/catalog/storage');
            if (error.code === 429) await delay(Math.max(1, error.retryAfter || 1) * 1000);
            await bot.failure(update);
          }
          store.state.offset = update.update_id + 1;
          await store.save();
          if (!running) break;
        }
        if (running && Date.now() >= digestAt) {
          await bot.digest();
          digestAt = Date.now() + 60_000;
        }
      } catch (error) {
        if (error.code === 'BOT_STORAGE') throw error;
        console.error('Bot loop deferred; code:', error.code || 'network/storage');
        await delay(Math.max(5, error.retryAfter || 0) * 1000);
      }
    }
  } finally {
    process.off('SIGTERM', stop);
    process.off('SIGINT', stop);
    await store.close();
  }
}

main().catch((error) => {
  // Telegram transport errors are sanitized before reaching this handler.
  console.error('Bot startup failed:', error.code || 'configuration/network', error.message);
  process.exit(1);
});
