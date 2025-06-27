import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: '로그아웃 성공' }, { status: 200 });
  response.cookies.delete('auth_token'); // auth_token 쿠키 삭제
  return response;
}
