import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const memoryKv = () => {
  const data = new Map();
  return {
    async get(key, options) {
      const value = data.get(key);
      return options?.type === 'json' && value ? JSON.parse(value) : value ?? null;
    },
    async put(key, value) { data.set(key, value); },
  };
};

test('health endpoint is available without exposing configuration', async () => {
  const env = {
    TELEGRAM_BOT_TOKEN: 'test', TELEGRAM_WEBHOOK_SECRET: 'hook', ADMIN_SETUP_SECRET: 'admin', UNITY_TELEGRAM_SECRET: 'integration',
    UNITY_API_URL: 'https://unityevent.ru/api/v1', UNITY_SITE_URL: 'https://unityevent.ru', BOT_STATE: memoryKv(),
  };
  const response = await worker.fetch(new Request('https://bot.example/'), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: 'unity-telegram-bot' });
});

test('webhook rejects requests without Telegram secret', async () => {
  const env = {
    TELEGRAM_BOT_TOKEN: 'test', TELEGRAM_WEBHOOK_SECRET: 'hook', ADMIN_SETUP_SECRET: 'admin', UNITY_TELEGRAM_SECRET: 'integration',
    UNITY_API_URL: 'https://unityevent.ru/api/v1', UNITY_SITE_URL: 'https://unityevent.ru', BOT_STATE: memoryKv(),
  };
  const response = await worker.fetch(new Request('https://bot.example/telegram', { method: 'POST', body: '{}' }), env);
  assert.equal(response.status, 403);
});
