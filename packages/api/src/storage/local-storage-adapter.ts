import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { StorageAdapter } from '@/storage/storage-adapter';

function uploadsRoot(): string {
  const raw = process.env.UPLOADS_ROOT?.trim();
  if (raw) return path.resolve(raw);
  return path.resolve(process.cwd(), 'uploads');
}

function publicBase(): string {
  const raw = process.env.PUBLIC_UPLOADS_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  const site = process.env.PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return `${site.replace(/\/$/, '')}/uploads`;
  return 'http://localhost:3000/uploads';
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly root: string;
  private readonly baseUrl: string;

  constructor() {
    this.root = uploadsRoot();
    this.baseUrl = publicBase();
  }

  getUrl(relativePath: string): string {
    const clean = relativePath.replace(/^\/+/, '');
    return `${this.baseUrl}/${clean}`;
  }

  async upload(buffer: Buffer, relativePath: string): Promise<string> {
    const clean = relativePath.replace(/^\/+/, '').replace(/\.\./g, '');
    const abs = path.join(this.root, clean);
    const dir = path.dirname(abs);
    await mkdir(dir, { recursive: true });
    await writeFile(abs, buffer);
    return this.getUrl(clean);
  }

  async delete(relativePath: string): Promise<void> {
    const clean = relativePath.replace(/^\/+/, '').replace(/\.\./g, '');
    if (!clean) return;
    const abs = path.join(this.root, clean);
    try {
      await unlink(abs);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== 'ENOENT') throw e;
    }
  }
}
