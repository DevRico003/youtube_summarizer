import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Paths that should bypass the first-run check
 * - /setup: The setup wizard itself
 * - /_next: Next.js internal assets
 * - /api: API routes (need to be accessible for setup)
 * - Static files with extensions
 */
const BYPASS_PATHS = [
  '/setup',
  '/_next',
  '/api',
  '/favicon.ico',
];

/**
 * Check if the request path should bypass the first-run check
 */
function shouldBypass(pathname: string): boolean {
  // Check if path starts with any bypass prefix
  if (BYPASS_PATHS.some(prefix => pathname.startsWith(prefix))) {
    return true;
  }

  // Allow static files (paths with file extensions)
  if (/\.\w+$/.test(pathname)) {
    return true;
  }

  return false;
}

/**
 * Middleware for first-run detection
 * Redirects to /setup if APP_SECRET is not configured
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow bypass paths through
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  // Check if APP_SECRET is configured
  const hasAppSecret = !!process.env.APP_SECRET && process.env.APP_SECRET.length > 0;

  // If not configured, redirect to setup wizard
  if (!hasAppSecret) {
    const setupUrl = new URL('/setup', request.url);
    return NextResponse.redirect(setupUrl);
  }

  // App is configured, continue normally
  return NextResponse.next();
}

/**
 * Configure which paths the middleware runs on
 * Matches all paths except static files and internal Next.js paths
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
