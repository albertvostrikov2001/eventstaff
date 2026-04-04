import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-me-to-a-random-64-char-string',
);

interface TokenPayload {
  sub: string;
  roles: string[];
  activeRole: string;
  exp?: number;
}

async function getTokenPayload(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isWorkerRoute = pathname.startsWith('/worker');
  const isEmployerRoute = pathname.startsWith('/employer');
  const isAdminRoute = pathname.startsWith('/admin');

  if (!isWorkerRoute && !isEmployerRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await getTokenPayload(token);

  if (!payload) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const roles = payload.roles ?? [];
  const isAdmin = roles.includes('admin');

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (isWorkerRoute && !roles.includes('worker') && !isAdmin) {
    const redirectPath = roles.includes('employer') ? '/employer/dashboard' : '/auth/login';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (isEmployerRoute && !roles.includes('employer') && !isAdmin) {
    const redirectPath = roles.includes('worker') ? '/worker/dashboard' : '/auth/login';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/worker/:path*', '/employer/:path*', '/admin/:path*'],
};
