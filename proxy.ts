import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy configuration
 *
 * Auth checks are handled client-side via AuthContext since tokens are stored in localStorage.
 * This proxy only handles static asset routing and basic path configuration.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all paths through - auth is handled client-side
  // Static files are already excluded via matcher config
  if (/\.\w+$/.test(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * Configure which paths the proxy runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
