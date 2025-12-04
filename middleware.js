import { NextResponse } from 'next/server';

export function middleware(request) {
  // This is just a basic check - the real role validation happens on the client
  // For production, you should validate the token server-side
  const path = request.nextUrl.pathname;

  if (path.startsWith('/admin-dashboard')) {
    // Let the page handle the authentication check
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin-dashboard/:path*',
};
