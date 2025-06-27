import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_DIR = path.join(process.cwd(), 'data'); // 설정 파일을 저장할 디렉토리

// 임시 사용자 ID (인증 기능이 완벽하지 않으므로 임시로 사용)
const getUserId = (req: NextRequest) => {
  // 실제 환경에서는 인증 토큰 등에서 사용자 ID를 추출해야 합니다.
  // 여기서는 간단히 'default_user'를 사용합니다.
  return 'default_user';
};

const getUserSettingsPath = (userId: string) => {
  return path.join(SETTINGS_DIR, `${userId}_settings.json`);
};

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  const settingsPath = getUserSettingsPath(userId);

  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
    const settingsContent = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(settingsContent);
    return NextResponse.json(settings);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 파일이 없으면 기본 설정 반환
      return NextResponse.json({ pageLimit: 20, viewMode: 'pagination' });
    }
    console.error('Error reading user settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  const settingsPath = getUserSettingsPath(userId);

  try {
    const settings = await request.json();
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return NextResponse.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving user settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
