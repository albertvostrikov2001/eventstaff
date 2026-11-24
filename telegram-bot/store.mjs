import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { join } from 'node:path';

export async function openStore(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = join(directory, 'bot.lock');
  async function acquire() {
    const handle = await open(lockPath, 'wx', 0o600);
    await handle.writeFile(String(process.pid));
    await handle.close();
  }
  try { await acquire(); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(await readFile(lockPath, 'utf8'));
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Invalid bot.lock; check it manually');
    try { process.kill(pid, 0); throw new Error('Another bot process is running'); }
    catch (check) { if (check.code !== 'ESRCH') throw check; }
    await unlink(lockPath);
    await acquire();
  }
  const file = join(directory, 'state.json');
  let state;
  try {
    state = JSON.parse(await readFile(file, 'utf8'));
    if (state.version !== 1 || !state.users || typeof state.users !== 'object' || Array.isArray(state.users)) {
      throw new Error('Invalid bot state; restore the backup before starting');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') { await unlink(lockPath); throw error; }
    state = { version: 1, users: {}, offset: 0 };
  }
  return {
    state,
    async save() {
      // One process, sequential writes; rename keeps a crash from truncating state.json.
      try {
        await writeFile(`${file}.tmp`, JSON.stringify(state), { mode: 0o600 });
        await rename(`${file}.tmp`, file);
      } catch {
        const error = new Error('Cannot persist bot state');
        error.code = 'BOT_STORAGE';
        throw error;
      }
    },
    async close() { await unlink(lockPath); },
  };
}
