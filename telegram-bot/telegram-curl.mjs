import { spawn } from 'node:child_process';
import { isIPv4 } from 'node:net';
import { devNull } from 'node:os';

// Optional transport for VPS networks where Node's HTTP stack times out.
// The credential-bearing URL goes through stdin, never process arguments.
export function telegramCurlSettings(env = process.env) {
  let proxy;
  if (env.TELEGRAM_PROXY_URL?.trim()) {
    try {
      const parsed = new URL(env.TELEGRAM_PROXY_URL.trim());
      if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(parsed.protocol) ||
          !parsed.hostname || parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== '/')) {
        throw new Error();
      }
      // Resolve Telegram at the SOCKS proxy, not through the VPS's local DNS.
      if (parsed.protocol === 'socks5:') parsed.protocol = 'socks5h:';
      proxy = parsed.href;
    } catch { throw new Error('Invalid TELEGRAM_PROXY_URL'); }
  }
  const address = proxy ? undefined : env.TELEGRAM_API_IPV4?.trim();
  if (address && !isIPv4(address)) throw new Error('Invalid TELEGRAM_API_IPV4');
  return {
    args: [
      ...(address ? ['--resolve', 'api.telegram.org:443:' + address] : []),
      ...(!proxy ? ['--ipv4'] : []),
    ],
    // Keep proxy credentials out of process arguments; override NO_PROXY.
    config: proxy ? [`proxy = ${JSON.stringify(proxy)}`, 'noproxy = ""'] : [],
  };
}

export function telegramCurlConfig(url, options, settings, warmup = process.env.TELEGRAM_WARMUP === '1') {
  const resolveIndex = settings.args.indexOf('--resolve');
  const common = [
    ...settings.config,
    'connect-timeout = 10',
    'max-time = 40',
    ...(settings.args.includes('--ipv4') ? ['ipv4'] : []),
    ...(resolveIndex >= 0 ? [`resolve = ${JSON.stringify(settings.args[resolveIndex + 1])}`] : []),
  ];
  return [
    ...(warmup ? [
      ...common,
      'url = "https://api.telegram.org/"',
      'head',
      `output = ${JSON.stringify(devNull)}`,
      'next',
    ] : []),
    ...common,
    `url = ${JSON.stringify(url)}`,
    `request = ${JSON.stringify(options.method)}`,
    'header = "Content-Type: application/json"',
    `data-binary = ${JSON.stringify(options.body)}`,
    `write-out = ${JSON.stringify('\n%{http_code}')}`,
    '',
  ].join('\n');
}

export function telegramCurlRequest(url, options) {
  return new Promise((resolve, reject) => {
    const settings = telegramCurlSettings();
    const child = spawn('curl', [
      ...settings.args,
      '--silent', '--config', '-',
    ], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, signal: options.signal });
    const chunks = [];
    let size = 0;
    child.stdout.on('data', (chunk) => {
      size += chunk.length;
      if (size > 8 * 1024 * 1024) { child.kill(); return; }
      chunks.push(chunk);
    });
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => {});
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 || size > 8 * 1024 * 1024) {
        const error = new Error('Telegram curl transport failed');
        error.code = `CURL_${code}`;
        reject(error);
        return;
      }
      const output = Buffer.concat(chunks).toString('utf8');
      const split = output.lastIndexOf('\n');
      const status = Number(output.slice(split + 1));
      resolve({
        ok: status >= 200 && status < 300,
        status,
        json: async () => JSON.parse(output.slice(0, split)),
      });
    });
    child.stdin.end(telegramCurlConfig(url, options, settings));
  });
}
