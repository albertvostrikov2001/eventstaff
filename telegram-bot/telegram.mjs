import { request } from 'node:https';
import { telegramCurlRequest } from './telegram-curl.mjs';

// Dedicated IPv4 connections avoid Node fetch/Undici connection failures observed
// on the production VPS. TLS still verifies api.telegram.org's certificate.
function telegramRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: options.method,
      headers: { ...options.headers, 'content-length': Buffer.byteLength(options.body) },
      signal: options.signal,
      family: 4,
      agent: false,
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) { res.destroy(new Error('Telegram response too large')); return; }
        chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        json: async () => JSON.parse(Buffer.concat(chunks).toString('utf8')),
      }));
    });
    req.on('error', reject);
    req.end(options.body);
  });
}

export class TelegramError extends Error {
  constructor(code, retryAfter) {
    super(`Telegram HTTP/API ${code}`);
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export function createTelegram(token, fetcher = process.env.TELEGRAM_TRANSPORT === 'curl' || process.env.TELEGRAM_PROXY_URL?.trim() ? telegramCurlRequest : telegramRequest) {
  let lastSend = 0;
  const chatSends = new Map();
  return async (method, data = {}) => {
    if (method === 'sendMessage') {
      const current = Date.now();
      const sendAt = Math.max(current, lastSend + 50, (chatSends.get(String(data.chat_id)) || 0) + 1100);
      lastSend = sendAt;
      chatSends.set(String(data.chat_id), sendAt);
      if (sendAt > current) await new Promise((resolve) => setTimeout(resolve, sendAt - current));
    }
    // Never log fetch exceptions: their URL can contain the bot token.
    let response;
    try {
      response = await fetcher(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data), signal: AbortSignal.timeout(method === 'getUpdates' ? 40_000 : 20_000),
      });
    } catch (cause) {
      const error = new Error('Telegram network request failed');
      error.code = cause.code || cause.cause?.code || cause.name;
      throw error;
    }
    let body;
    try { body = await response.json(); } catch { throw new Error('Invalid Telegram response'); }
    if (!response.ok || !body.ok) throw new TelegramError(body.error_code || response.status, body.parameters?.retry_after);
    return body.result;
  };
}
