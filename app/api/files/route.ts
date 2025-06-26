import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

// 환경에 따른 기본 디렉토리 설정
const getStaticFilesRoot = () => {
  const envRoot = process.env.STATIC_FILES_ROOT
  if (envRoot) {
    return envRoot
  }
  // 기본값을 '/app/public/files'로 지정
  return "/app/public/files"
}

const STATIC_FILES_ROOT = getStaticFilesRoot()

interface FileItem {
  name: string
  type: "file" | "directory"
  size: number
  lastModified: string
  path: string
  extension?: string
}

// 데모용 디렉토리와 파일 생성
async function ensureDemoFiles() {
  try {
    const publicDir = "./public"
    const demoDir = path.join(publicDir, "demo")
    const imagesDir = path.join(demoDir, "images")
    const docsDir = path.join(demoDir, "documents")

    // 디렉토리 생성
    await fs.mkdir(demoDir, { recursive: true })
    await fs.mkdir(imagesDir, { recursive: true })
    await fs.mkdir(docsDir, { recursive: true })

    // 데모 파일들 생성
    const demoFiles = [
      {
        path: path.join(demoDir, "readme.txt"),
        content: "이것은 nginx 파일 브라우저 데모입니다.\n\n파일 탐색, 다운로드, 검색 기능을 테스트해보세요!",
      },
      {
        path: path.join(demoDir, "sample.json"),
        content: JSON.stringify(
          {
            name: "Sample JSON File",
            description: "This is a sample JSON file for testing",
            version: "1.0.0",
            features: ["file browsing", "download", "search"],
          },
          null,
          2,
        ),
      },
      {
        path: path.join(docsDir, "guide.md"),
        content: `# 파일 브라우저 가이드

## 기능
- 파일 및 폴더 탐색
- 파일 다운로드
- 검색 기능
- 페이지네이션 / 무한스크롤

## 사용법
1. 폴더를 클릭하여 탐색
2. 파일을 다운로드하거나 링크 복사
3. 검색창에서 파일 검색
`,
      },
      {
        path: path.join(docsDir, "config.xml"),
        content: `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <server>
    <name>nginx-file-browser</name>
    <version>1.0</version>
  </server>
  <features>
    <feature name="download" enabled="true"/>
    <feature name="search" enabled="true"/>
  </features>
</configuration>`,
      },
    ]

    // 파일이 존재하지 않으면 생성
    for (const file of demoFiles) {
      try {
        await fs.access(file.path)
      } catch {
        await fs.writeFile(file.path, file.content, "utf-8")
      }
    }
  } catch (error) {
    console.log("Demo files creation skipped:", error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestedPath = searchParams.get("path") || "/"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""

    // 기본값 설정
    const safePage = isNaN(page) || page < 1 ? 1 : page
    const safeLimit = isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100)

    // 데모 파일 생성 (개발 환경에서만)
    if (STATIC_FILES_ROOT === "./public") {
      await ensureDemoFiles()
    }

    // 보안: 상위 디렉토리 접근 방지
    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "")
    const fullPath = path.join(STATIC_FILES_ROOT, safePath)

    // 루트 디렉토리 존재 확인
    try {
      await fs.access(STATIC_FILES_ROOT)
    } catch {
      console.error(`Root directory does not exist: ${STATIC_FILES_ROOT}`)
      return NextResponse.json(
        {
          files: [],
          total: 0,
          page: safePage,
          hasMore: false,
          error: `Root directory not found: ${STATIC_FILES_ROOT}`,
        },
        { status: 404 },
      )
    }

    // 경로가 루트 디렉토리 내에 있는지 확인
    const resolvedPath = path.resolve(fullPath)
    const resolvedRoot = path.resolve(STATIC_FILES_ROOT)

    if (!resolvedPath.startsWith(resolvedRoot)) {
      return NextResponse.json(
        {
          files: [],
          total: 0,
          page: safePage,
          hasMore: false,
          error: "Invalid path",
        },
        { status: 400 },
      )
    }

    const files: FileItem[] = []

    try {
      // 요청된 디렉토리 존재 확인
      const dirStats = await fs.stat(fullPath)
      if (!dirStats.isDirectory()) {
        return NextResponse.json(
          {
            files: [],
            total: 0,
            page: safePage,
            hasMore: false,
            error: "Path is not a directory",
          },
          { status: 400 },
        )
      }

      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry.name)
        const relativePath = path.join(safePath, entry.name).replace(/\\/g, "/")

        try {
          const stats = await fs.stat(entryPath)

          // 검색 필터 적용
          if (search && !entry.name.toLowerCase().includes(search.toLowerCase())) {
            continue
          }

          // 숨김 파일 제외 (선택사항)
          if (entry.name.startsWith(".")) {
            continue
          }

          const fileItem: FileItem = {
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            path: relativePath.startsWith("/") ? relativePath : "/" + relativePath,
            extension: entry.isFile() ? path.extname(entry.name).slice(1) : undefined,
          }

          files.push(fileItem)
        } catch (statError) {
          // 개별 파일 stat 오류는 무시하고 계속 진행
          console.warn(`Failed to stat ${entryPath}:`, statError)
        }
      }
    } catch (readdirError) {
      console.error(`Failed to read directory ${fullPath}:`, readdirError)
      return NextResponse.json(
        {
          files: [],
          total: 0,
          page: safePage,
          hasMore: false,
          error: `Directory not accessible: ${fullPath}`,
        },
        { status: 404 },
      )
    }

    // 정렬: 디렉토리 먼저, 그 다음 파일명 순
    files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    // 페이지네이션
    const total = files.length
    const startIndex = (safePage - 1) * safeLimit
    const endIndex = startIndex + safeLimit
    const paginatedFiles = files.slice(startIndex, endIndex)
    const hasMore = endIndex < total

    return NextResponse.json({
      files: paginatedFiles,
      total,
      page: safePage,
      hasMore,
    })
  } catch (error) {
    console.error("Files API error:", error)
    return NextResponse.json(
      {
        files: [],
        total: 0,
        page: 1,
        hasMore: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
