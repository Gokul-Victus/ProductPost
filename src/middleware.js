import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect the admin status route
  if (pathname.startsWith('/admin/status')) {
    const session = request.cookies.get('admin_session')?.value;
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin-password-123';

    if (session !== expectedPassword) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/status/:path*', '/admin/status'],
};
