import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Google Gemini API 관련 설정 (실제 사용 시 환경 변수 등으로 관리)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const getStaticFilesRoot = () => {
  const envRoot = process.env.STATIC_FILES_ROOT;
  if (envRoot) {
    return envRoot;
  }
  return "/app/public/files";
};

const STATIC_FILES_ROOT = getStaticFilesRoot();

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    const safePath = path.normalize(filePath).replace(/^(\.\.[\\/])+/, "");
    const fullPath = path.join(STATIC_FILES_ROOT, safePath);

    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(STATIC_FILES_ROOT);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileContent = await fs.readFile(fullPath, 'utf-8');

    // Gemini Pro API 호출 (예시)
    // 실제 환경에서는 @google/generative-ai 라이브러리 등을 사용하는 것이 좋습니다.
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `다음 파일 내용에 대한 5개의 핵심 키워드(태그)를 쉼표로 구분하여 제안해줘. 예시: 키워드1,키워드2,키워드3,키워드4,키워드5\n\n파일 내용:\n${fileContent}` },
            ],
          },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API error:', errorData);
      return NextResponse.json({ error: 'AI 태그 제안 서비스 오류' }, { status: geminiResponse.status });
    }

    const geminiResult = await geminiResponse.json();
    const tagsText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tags = tagsText.split(',').map((tag: string) => tag.trim()).filter(Boolean);

    return NextResponse.json({ tags });

  } catch (error) {
    console.error('Tag suggestion API error:', error);
    return NextResponse.json({ error: '태그 제안 중 오류가 발생했습니다.' }, { status: 500 });
  }
}