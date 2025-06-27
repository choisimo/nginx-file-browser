import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (username === 'admin' && password === 'password') {
    const response = NextResponse.json({ message: '로그인 성공' }, { status: 200 });
    // 실제 환경에서는 보안이 강화된 JWT 토큰 등을 사용해야 합니다.
    response.cookies.set('auth_token', 'dummy_auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 }); // 1일 유효
    return response;
  } else {
    return NextResponse.json({ error: '잘못된 사용자 이름 또는 비밀번호' }, { status: 401 });
  }
}
