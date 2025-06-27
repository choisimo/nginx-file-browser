import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const getStaticFilesRoot = () => {
  const envRoot = process.env.STATIC_FILES_ROOT;
  if (envRoot) {
    return envRoot;
  }
  return "/app/public/files";
};

const STATIC_FILES_ROOT = getStaticFilesRoot();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');
    const size = Number.parseInt(searchParams.get('size') || '100');

    if (!filePath) {
      return new NextResponse('File path is required', { status: 400 });
    }

    const safePath = path.normalize(filePath).replace(/^(\.\.[/\])+/, "");
    const fullPath = path.join(STATIC_FILES_ROOT, safePath);

    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(STATIC_FILES_ROOT);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      return new NextResponse('Invalid file path', { status: 400 });
    }

    try {
      await fs.access(fullPath);
    } catch {
      return new NextResponse('File not found', { status: 404 });
    }

    const imageBuffer = await fs.readFile(fullPath);

    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(size, size, { fit: 'inside' })
      .toFormat('jpeg')
      .toBuffer();

    return new NextResponse(thumbnailBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // 1년 캐시
      },
    });

  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return new NextResponse('Failed to generate thumbnail', { status: 500 });
  }
}
