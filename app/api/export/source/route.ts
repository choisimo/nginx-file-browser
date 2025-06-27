import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';

// 프로젝트 루트 디렉토리
const projectRoot = process.cwd();

// 포함할 디렉토리 및 파일 목록
const includePaths = [
  'app',
  'components',
  'hooks',
  'lib',
  'public',
  'styles',
  '.gitignore',
  'components.json',
  'docker-compose.yml',
  'Dockerfile',
  'LICENSE',
  'package-lock.json',
  'package.json',
  'README.md',
  'tailwind.config.ts',
  'tsconfig.json',
];

// 제외할 패턴 목록 (정규식)
const excludePatterns = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /\.history/,
  /\.DS_Store/,
  /\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
];

// 파일 확장자별 그룹
const fileGroups: { [key: string]: string[] } = {
  typescript: ['.ts', '.tsx'],
  javascript: ['.js', '.jsx'],
  css: ['.css'],
  json: ['.json'],
  markdown: ['.md'],
  docker: ['Dockerfile', 'docker-compose.yml'],
  config: ['.gitignore', 'tailwind.config.ts', 'tsconfig.json', 'LICENSE'],
  other: [], // 위에 해당하지 않는 나머지 텍스트 파일
};

async function getProjectFiles(dir: string): Promise<string[]> {
  let files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(projectRoot, fullPath);

    if (excludePatterns.some(pattern => pattern.test(relativePath))) {
      continue;
    }

    if (entry.isDirectory()) {
      files = files.concat(await getProjectFiles(fullPath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

export async function GET() {
  try {
    const allFiles = (await Promise.all(includePaths.map(p => {
      const fullPath = path.join(projectRoot, p);
      return fs.stat(fullPath).then(stat => {
        if (stat.isDirectory()) {
          return getProjectFiles(fullPath);
        }
        return [p];
      }).catch(() => []);
    }))).flat();

    const uniqueFiles = [...new Set(allFiles)];

    const categorizedFiles: { [key: string]: { path: string; content: string }[] } = {};

    for (const filePath of uniqueFiles) {
      const ext = path.extname(filePath);
      const fileName = path.basename(filePath);

      let groupName = 'other';
      for (const [group, extensions] of Object.entries(fileGroups)) {
        if (extensions.includes(ext) || extensions.includes(fileName)) {
          groupName = group;
          break;
        }
      }

      if (!categorizedFiles[groupName]) {
        categorizedFiles[groupName] = [];
      }

      try {
        const content = await fs.readFile(path.join(projectRoot, filePath), 'utf-8');
        categorizedFiles[groupName].push({ path: filePath, content });
      } catch (error) {
        // 바이너리 파일 등 읽기 실패 시 건너뛰기
        console.warn(`Could not read file: ${filePath}`, error);
      }
    }

    const archive = archiver('zip', {
      zlib: { level: 9 }, // 최대 압축률
    });

    for (const [group, files] of Object.entries(categorizedFiles)) {
      if (files.length > 0) {
        const combinedContent = files
          .map(file => `/* --- File: ${file.path} --- */\n\n${file.content}`)
          .join('\n\n' + '-'.repeat(80) + '\n\n');
        
        archive.append(combinedContent, { name: `${group}.txt` });
      }
    }

    const passThrough = new (require('stream').PassThrough)();
    archive.pipe(passThrough);
    archive.finalize();

    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="project-source.zip"`,
    });

    return new NextResponse(passThrough as any, { headers });

  } catch (error) {
    console.error('Error creating project source zip:', error);
    return new NextResponse('Failed to create zip file', { status: 500 });
  }
}