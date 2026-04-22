import { jwtVerify } from 'jose';

const accessSecret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-me-to-a-random-64-char-string',
);

export async function verifyAccessToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}
