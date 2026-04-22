import type { ConnectionOptions } from 'bullmq';

export function bullmqConnectionFromEnv(): ConnectionOptions {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  try {
    const u = new URL(url);
    const port = u.port ? parseInt(u.port, 10) : 6379;
    const username = u.username ? decodeURIComponent(u.username) : undefined;
    const password = u.password ? decodeURIComponent(u.password) : undefined;
    return {
      host: u.hostname,
      port,
      username: username || undefined,
      password: password || undefined,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}
