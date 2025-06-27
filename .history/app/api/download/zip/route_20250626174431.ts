import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import archiver from "archiver"

// 환경에 따른 기본 디렉토리 설정
const getStaticFilesRoot = () => {
  const envRoot = process.env.STATIC_FILES_ROOT
  if (envRoot) {
    return envRoot
  }
  return "./public/files"
}

const STATIC_FILES_ROOT = getStaticFilesRoot()

export async function POST(request: NextRequest) {
  try {
    const { paths } = await request.json()

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: "유효한 파일 경로가 필요합니다." },
        { status: 400 }
      )
    }

    // 스트림을 위한 헤더 설정
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="files_${new Date().toISOString().slice(0, 10)}.zip"`,
    })

    // ReadableStream을 사용하여 실시간 압축
    const stream = new ReadableStream({
      start(controller) {
        const archive = archiver('zip', {
          zlib: { level: 9 }
        })

        // 에러 핸들링
        archive.on('error', (err) => {
          console.error('Archive error:', err)
          controller.error(err)
        })

        // 데이터를 스트림으로 전송
        archive.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(chunk))
        })

        // 압축 완료 시
        archive.on('end', () => {
          controller.close()
        })

        // 파일들을 아카이브에 추가
        const addFilesToArchive = async () => {
          try {
            for (const filePath of paths) {
              const fullPath = path.join(STATIC_FILES_ROOT, filePath)
              const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath

              try {
                const stats = await fs.stat(fullPath)
                
                if (stats.isDirectory()) {
                  // 디렉토리인 경우 재귀적으로 추가
                  archive.directory(fullPath, relativePath)
                } else {
                  // 파일인 경우 직접 추가
                  archive.file(fullPath, { name: relativePath })
                }
              } catch (error) {
                console.warn(`파일을 찾을 수 없습니다: ${fullPath}`)
                // 개별 파일 오류는 무시하고 계속 진행
              }
            }

            // 아카이브 완료
            await archive.finalize()
          } catch (error) {
            console.error('파일 추가 중 오류:', error)
            controller.error(error)
          }
        }

        addFilesToArchive()
      }
    })

    return new Response(stream, { headers })

  } catch (error) {
    console.error('ZIP 다운로드 오류:', error)
    return NextResponse.json(
      { error: "압축 파일 생성 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
