import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const getStaticFilesRoot = () => {
  const envRoot = process.env.STATIC_FILES_ROOT
  if (envRoot) {
    return envRoot
  }
  // 기본값을 '/app/public/files'로 지정
  return "/app/public/files"
}

const STATIC_FILES_ROOT = getStaticFilesRoot()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestedPath = searchParams.get("path")

    if (!requestedPath) {
      return NextResponse.json({ error: "Path parameter is required" }, { status: 400 })
    }

    // 보안: 상위 디렉토리 접근 방지
    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "")
    const fullPath = path.join(STATIC_FILES_ROOT, safePath)

    // 루트 디렉토리 존재 확인
    try {
      await fs.access(STATIC_FILES_ROOT)
    } catch {
      return NextResponse.json({ error: `Root directory not found: ${STATIC_FILES_ROOT}` }, { status: 404 })
    }

    // 경로가 루트 디렉토리 내에 있는지 확인
    const resolvedPath = path.resolve(fullPath)
    const resolvedRoot = path.resolve(STATIC_FILES_ROOT)

    if (!resolvedPath.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    try {
      const stats = await fs.stat(fullPath)

      if (stats.isDirectory()) {
        return NextResponse.json({ error: "Cannot download directory" }, { status: 400 })
      }

      const fileBuffer = await fs.readFile(fullPath)
      const fileName = path.basename(fullPath)

      // MIME 타입 결정
      const ext = path.extname(fileName).toLowerCase()
      let contentType = "application/octet-stream"

      const mimeTypes: { [key: string]: string } = {
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".xml": "application/xml",
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".mp4": "video/mp4",
        ".mp3": "audio/mpeg",
        ".zip": "application/zip",
      }

      if (mimeTypes[ext]) {
        contentType = mimeTypes[ext]
      }

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
          "Content-Length": stats.size.toString(),
        },
      })
    } catch (fileError) {
      console.error(`File access error for ${fullPath}:`, fileError)
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("Download API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
