import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.has('auth_token') // 실제 환경에서는 JWT 또는 세션 검증 로직
  const { pathname } = request.nextUrl

  // 로그인 페이지는 인증 없이 접근 가능
  if (pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // 보호된 라우트에 접근 시 인증 확인
  if (!isAuthenticated) {
    // 로그인 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (authentication API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|browser-sync).*)',
  ],
}
