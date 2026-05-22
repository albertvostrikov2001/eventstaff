import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES: Record<string, string[]> = {
  '/admin': ['admin'],
  '/employer': ['employer'],
  '/worker': ['worker'],
};

const ROLE_REDIRECTS: Record<string, string> = {
  worker: '/worker/dashboard',
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
  moderator: '/admin/dashboard',
};

function decodeJwtPayload(token: string): { activeRole?: string; roles?: string[] } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part, 'base64url').toString('utf8');
    return JSON.parse(json) as { activeRole?: string; roles?: string[] };
  } catch {
    return null;
  }
}

function userHasRole(payload: { activeRole?: string; roles?: string[] }, allowed: string[]): boolean {
  const roles = payload.roles ?? [];
  if (allowed.includes('admin') && roles.includes('admin')) return true;
  const active = payload.activeRole;
  if (active && allowed.includes(active)) return true;
  return allowed.some((r) => roles.includes(r));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedPrefix = Object.keys(PROTECTED_PREFIXES).find((p) => pathname.startsWith(p));
  if (!protectedPrefix) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const allowedRoles = PROTECTED_PREFIXES[protectedPrefix];
  if (!userHasRole(payload, allowedRoles)) {
    const target =
      ROLE_REDIRECTS[payload.activeRole ?? ''] ??
      (payload.roles?.includes('admin') ? '/admin/dashboard' : '/auth/login');
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/employer/:path*', '/worker/:path*'],
};
