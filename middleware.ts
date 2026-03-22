import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

// Routes that require authentication
const protectedRoutes = [
  '/checkout',
  '/orders',
  '/order-lists',
  '/profile',
  '/wishlist',
  '/admin',
];

// Routes that only admins can access
const adminRoutes = ['/admin'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Check if the route requires authentication
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  if (!isProtected) return NextResponse.next();

  // If not authenticated, redirect to home (auth overlay handles login)
  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Check admin access
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  if (isAdminRoute) {
    const role = (req.auth.user as { role?: string })?.role;
    if (role !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files, api routes (handled by their own auth), and _next
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
