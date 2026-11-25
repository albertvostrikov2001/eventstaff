import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBot } from './bot.mjs';
import { createCatalog, describe, itemPhoto, queryFor, parseRate, validDate } from './catalog.mjs';
import { openStore } from './store.mjs';
import { createTelegram, TelegramError } from './telegram.mjs';
import { telegramCurlRequest, telegramCurlSettings, telegramCurlConfig } from './telegram-curl.mjs';

function harness(role = 'worker') {
  const sent = [];
  let time = 1_000_000;
  let items = [{ id: 'old', title: 'Существующая вакансия' }];
  let failCatalog = false;
  let failure;
  const user = { role, hours: 24, enabled: false, seen: [] };
  const store = { state: { users: { '1': user } }, save: async () => {} };
  const catalog = {
    options: async (kind) => kind === 'categories' ? [{ id: 'waiter', name: 'Официант' }] : [{ id: 'city1', name: 'Новороссийск' }],
    all: async () => { if (failCatalog) throw new Error('offline'); return items; },
    page: async () => ({ data: items, meta: { totalPages: 1 } }),
  };
  const telegram = async (method, data) => {
    if (failure && ['sendMessage', 'sendPhoto', 'editMessageMedia'].includes(method)) throw failure;
    if (['sendMessage', 'sendPhoto', 'editMessageMedia'].includes(method)) sent.push({ ...data, _method: method });
  };
  const bot = createBot({ store, catalog, telegram, siteUrl: 'https://unityevent.ru', now: () => time });
  const action = (data) => bot.handle({ callback_query: { id: 'q', data, message: { chat: { id: 1, type: 'private' } } } });
  const text = (text) => bot.handle({ message: { chat: { id: 1, type: 'private' }, text } });
  return { bot, store, sent, action, text,
    setItems: (next) => { items = next; }, advance: () => { time += 25 * 3_600_000; },
    failCatalog: () => { failCatalog = true; }, failSend: (error) => { failure = error; } };
}

test('filters map to public API for both roles, including Moscow day boundaries', () => {
  const user = { role: 'worker', category: 'waiter', cityId: 'abc', rateMin: 0, rateMax: 5000, date: '2026-12-25' };
  const query = queryFor(user, 2);
  assert.equal(query.get('rateMin'), '0');
  assert.equal(query.get('category'), 'waiter');
  assert.equal(query.get('cityId'), 'abc');
  assert.equal(query.get('page'), '2');
  assert.equal(query.get('dateFrom'), '2026-12-25T00:00:00+03:00');
  assert.equal(query.get('dateTo'), '2026-12-25T23:59:59.999+03:00');
  assert.equal(queryFor({ ...user, role: 'employer' }).get('availabilityDate'), '2026-12-25');
  assert.equal(queryFor({ ...user, role: 'employer' }).has('dateFrom'), false);
});

test('invalid dates and ranges are rejected', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('25.12.2026'), false);
  assert.equal(parseRate('5000 1000'), null);
  assert.equal(parseRate('-1 5000'), null);
  assert.deepEqual(parseRate('0 5000.50'), { rateMin: 0, rateMax: 5000.5 });
});

test('catalog scans all pages and fails closed on API error', async () => {
  const urls = [];
  const api = createCatalog('https://example.test/api/v1', async (url) => {
    urls.push(url);
    const page = Number(new URL(url).searchParams.get('page'));
    return { ok: true, json: async () => ({ success: true, data: [{ id: `item${page}` }], meta: { totalPages: 3 } }) };
  });
  assert.equal((await api.all({ role: 'employer' })).length, 3);
  assert.equal(urls.length, 3);
  assert.ok(urls[0].includes('/catalog/workers?'));
  const bad = createCatalog('https://example.test', async () => ({ ok: false, status: 503 }));
  await assert.rejects(() => bad.all({ role: 'worker' }), /503/);
});

test('onboarding offers roles and ignores groups', async () => {
  const h = harness();
  delete h.store.state.users['1'];
  await h.bot.init();
  await h.text('/start');
  assert.match(h.sent[0].text, /чем бот может помочь/);
  await h.action('role:employer');
  assert.equal(h.store.state.users['1'].role, 'employer');
  const count = h.sent.length;
  await h.bot.handle({ message: { chat: { id: 2, type: 'group' }, text: '/start' } });
  assert.equal(h.sent.length, count);
});

test('onboarding asks filters and explicit notification consent', async () => {
  const h = harness(); delete h.store.state.users['1']; await h.bot.init();
  await h.text('/start'); await h.action('role:worker');
  assert.equal(h.store.state.users['1'].onboarding, 'category');
  await h.action('oncat:waiter');
  assert.equal(h.store.state.users['1'].onboarding, 'city');
  await h.action('oncity:city1');
  assert.equal(h.store.state.users['1'].onboarding, 'notifications');
  assert.match(h.sent.at(-1).text, /Включить уведомления/);
  await h.action('subscribe:0.25');
  assert.equal(h.store.state.users['1'].enabled, true);
  assert.equal(h.store.state.users['1'].hours, 0.25);
  assert.ok(h.store.state.users['1'].notificationsConsentAt);
});

test('carousel edits one photo card and uses site images with a branded fallback', async () => {
  const h = harness(); await h.bot.init();
  h.setItems([{ id: 'v1', title: 'Официант', coverImageUrl: 'https://unityevent.ru/uploads/v1.jpg' }]);
  await h.bot.handle({ callback_query: { id: 'q', data: 'list:0', message: {
    message_id: 77, photo: [{ file_id: 'old' }], chat: { id: 1, type: 'private' },
  } } });
  assert.equal(h.sent[0]._method, 'editMessageMedia');
  assert.equal(h.sent[0].message_id, 77);
  assert.equal(h.sent[0].media.media, 'https://unityevent.ru/uploads/v1.jpg');
  assert.equal(itemPhoto('https://unityevent.ru', { role: 'worker' }, {}),
    'https://unityevent.ru/unity-mark-original-green-1024.png');
});

test('digest sends only new visible entries, excludes closed entries, and does not repeat', async () => {
  const h = harness(); await h.bot.init();
  await h.action('subscribe:24');
  h.setItems([{ id: 'new', title: 'Новая вакансия' }]);
  h.advance(); h.sent.length = 0;
  await h.bot.digest();
  assert.equal(h.sent.length, 1);
  assert.match(h.sent[0].caption, /Новая вакансия/);
  assert.doesNotMatch(h.sent[0].caption, /Существующая/);
  h.advance(); await h.bot.digest();
  assert.equal(h.sent.length, 1);
});

test('more than five new records are retained for next digest', async () => {
  const h = harness(); await h.bot.init(); await h.action('subscribe:0.25');
  h.setItems(Array.from({ length: 7 }, (_, i) => ({ id: `n${i}`, title: `Новое ${i}` })));
  h.advance(); await h.bot.digest();
  assert.equal(h.store.state.users['1'].seen.length, 6);
  h.advance(); await h.bot.digest();
  assert.equal(h.store.state.users['1'].seen.length, 8);
});

test('filter change resets baseline; a failed baseline leaves filters intact', async () => {
  const h = harness(); await h.bot.init(); await h.action('subscribe:24');
  h.setItems([{ id: 'other', title: 'Другой результат' }]);
  await h.action('cat:waiter');
  assert.deepEqual(h.store.state.users['1'].seen, ['other']);
  h.failCatalog();
  await assert.rejects(() => h.action('cat:all'));
  assert.equal(h.store.state.users['1'].category, 'waiter');
});

test('failed delivery is retried without marking results seen; blocked bot disables subscription', async () => {
  const h = harness(); await h.bot.init(); await h.action('subscribe:24');
  h.setItems([{ id: 'new', title: 'Новое' }]); h.advance();
  h.failSend(new TelegramError(429, 600)); await h.bot.digest();
  assert.deepEqual(h.store.state.users['1'].seen, ['old']);
  assert.equal(h.store.state.users['1'].enabled, true);
  h.advance(); h.failSend(new TelegramError(403)); await h.bot.digest();
  assert.equal(h.store.state.users['1'].enabled, false);
});

test('stop and delete work, role switch disables old subscriptions', async () => {
  const h = harness(); await h.bot.init(); await h.action('subscribe:24');
  await h.action('role:employer');
  assert.equal(h.store.state.users['1'].enabled, false);
  await h.action('subscribe:24'); await h.text('/stop');
  assert.equal(h.store.state.users['1'].enabled, false);
  await h.text('/delete'); assert.equal(h.store.state.users['1'], undefined);
});

test('browse reads latest catalog every time and links to website', async () => {
  const h = harness('employer'); await h.bot.init();
  h.setItems([{ id: 'w1', firstName: 'Анна', lastName: 'Иванова', desiredRate: '2500', rateType: 'per_shift' }]);
  await h.action('list:0');
  assert.match(h.sent[0].caption, /Анна Иванова/);
  assert.match(h.sent[0].caption, /за смену/);
  assert.equal(h.sent[0]._method, 'sendPhoto');
  assert.equal(h.sent[0].reply_markup.inline_keyboard[0][0].url, 'https://unityevent.ru/workers/w1');
  h.setItems([]); h.sent.length = 0; await h.action('list:0');
  assert.match(h.sent[0].text, /пока ничего нет/);
});

test('state persists preferences and offset, and prevents a second process', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'unity-bot-'));
  try {
    const first = await openStore(dir);
    await assert.rejects(() => openStore(dir), /Another bot process/);
    first.state.users['1'] = { role: 'worker', enabled: true, hours: 24, seen: ['a'], nextAt: 123 };
    first.state.offset = 42; await first.save(); await first.close();
    const second = await openStore(dir);
    assert.equal(second.state.offset, 42);
    assert.deepEqual(second.state.users['1'].seen, ['a']);
    assert.equal(JSON.parse(await readFile(join(dir, 'state.json'), 'utf8')).version, 1);
    await second.close();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Telegram network errors do not expose bot token', async () => {
  const api = createTelegram('secret-token', async (url) => { throw new Error(url); });
  await assert.rejects(() => api('getMe'), (error) => !error.message.includes('secret-token'));
});

test('curl transport rejects malformed route overrides before making requests', async () => {
  const previous = process.env.TELEGRAM_API_IPV4;
  try {
    process.env.TELEGRAM_API_IPV4 = 'not-an-ip';
    await assert.rejects(() => telegramCurlRequest('https://api.telegram.org/test', {}), /Invalid TELEGRAM_API_IPV4/);
  } finally {
    if (previous === undefined) delete process.env.TELEGRAM_API_IPV4;
    else process.env.TELEGRAM_API_IPV4 = previous;
  }
});

test('proxy route resolves Telegram remotely and ignores a pinned direct address', () => {
  const settings = telegramCurlSettings({
    TELEGRAM_PROXY_URL: 'socks5://user:pass@proxy.example:1080',
    TELEGRAM_API_IPV4: '149.154.167.220',
  });
  assert.deepEqual(settings.args, []);
  assert.ok(settings.config.includes('proxy = "socks5h://user:pass@proxy.example:1080"'));
  assert.ok(settings.config.includes('noproxy = ""'));
});

test('proxy credentials never appear in validation errors or process arguments', () => {
  const settings = telegramCurlSettings({ TELEGRAM_PROXY_URL: 'https://private:secret@proxy.example:443' });
  assert.equal(settings.args.join(' ').includes('secret'), false);
  for (const url of ['file:///private/secret', 'https://private:secret@proxy.example/path', 'not a proxy secret']) {
    assert.throws(() => telegramCurlSettings({ TELEGRAM_PROXY_URL: url }), (error) =>
      error.message === 'Invalid TELEGRAM_PROXY_URL');
  }
});

test('warmup isolates HEAD output and preserves the real POST and its response status', () => {
  const settings = telegramCurlSettings({});
  const config = telegramCurlConfig('https://api.telegram.org/bot-test/sendMessage', {
    method: 'POST', body: JSON.stringify({ chat_id: 1, text: 'Привет\nЮнити' }),
  }, settings, true);
  const [head, post] = config.split('\nnext\n');
  assert.match(head, /url = "https:\/\/api.telegram.org\/"/);
  assert.match(head, /\nhead\noutput = /);
  assert.equal(head.includes('bot-test'), false);
  assert.equal(head.includes('write-out'), false);
  assert.match(post, /request = "POST"/);
  assert.equal(post.includes('output = '), false);
  const bodyLine = post.split('\n').find((line) => line.startsWith('data-binary = '));
  assert.deepEqual(JSON.parse(JSON.parse(bodyLine.slice('data-binary = '.length))), { chat_id: 1, text: 'Привет\nЮнити' });
  assert.equal(config.match(/write-out = /g).length, 1);
});

test('plain-text descriptions truncate untrusted fields', () => {
  const text = describe({ role: 'worker' }, { title: '<b>Test</b>'.repeat(500), rate: 5000, dateStart: 'invalid' });
  assert.ok(text.length < 500);
  assert.match(text, /уточняется/);
});
