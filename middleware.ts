import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow access to /terminal and static files
  if (
    request.nextUrl.pathname === '/terminal' ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/favicon') ||
    request.nextUrl.pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Check for unlock state (cookie)
  const unlocked = request.cookies.get('sidebarUnlocked')?.value === 'true';
  console.log(unlocked);
  if (!unlocked) {
    return NextResponse.redirect(new URL('/terminal', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!terminal|_next|api|favicon|static).*)',
  ],
}; 