import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

// 환경에 따른 기본 디렉토리 설정
const getStaticFilesRoot = () => {
  const envRoot = process.env.STATIC_FILES_ROOT
  if (envRoot) {
    return envRoot
  }
  return "./public/files"
}

const STATIC_FILES_ROOT = getStaticFilesRoot()

// 허용된 파일 확장자 (환경 변수로 설정 가능)
const getAllowedExtensions = (): string[] => {
  const envExtensions = process.env.ALLOWED_UPLOAD_EXTENSIONS
  if (envExtensions) {
    return envExtensions.split(',').map(ext => ext.trim().toLowerCase())
  }
  // 기본 허용 확장자
  return ['txt', 'md', 'json', 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'csv']
}

// 최대 파일 크기 (기본 10MB)
const getMaxFileSize = (): number => {
  const envSize = process.env.MAX_UPLOAD_SIZE
  if (envSize) {
    return parseInt(envSize, 10)
  }
  return 10 * 1024 * 1024 // 10MB
}

const ALLOWED_EXTENSIONS = getAllowedExtensions()
const MAX_FILE_SIZE = getMaxFileSize()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const targetPath = formData.get('path') as string || '/'

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "업로드할 파일이 없습니다." },
        { status: 400 }
      )
    }

    const results = []

    for (const file of files) {
      try {
        // 파일 크기 검증
        if (file.size > MAX_FILE_SIZE) {
          results.push({
            name: file.name,
            success: false,
            error: `파일 크기가 너무 큽니다. (최대 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`
          })
          continue
        }

        // 파일 확장자 검증
        const fileExtension = path.extname(file.name).slice(1).toLowerCase()
        if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
          results.push({
            name: file.name,
            success: false,
            error: `허용되지 않는 파일 형식입니다. 허용: ${ALLOWED_EXTENSIONS.join(', ')}`
          })
          continue
        }

        // 안전한 파일명 생성 (특수 문자 제거)
        const safeFileName = file.name.replace(/[^a-zA-Z0-9가-힣.\-_]/g, '_')
        
        // 대상 디렉토리 경로 구성
        const targetDir = path.join(STATIC_FILES_ROOT, targetPath)
        const filePath = path.join(targetDir, safeFileName)

        // 디렉토리가 없으면 생성
        await fs.mkdir(targetDir, { recursive: true })

        // 파일이 이미 존재하는 경우 이름에 숫자 추가
        let finalPath = filePath
        let counter = 1
        while (true) {
          try {
            await fs.access(finalPath)
            // 파일이 존재하면 새 이름 생성
            const ext = path.extname(safeFileName)
            const nameWithoutExt = path.basename(safeFileName, ext)
            const newFileName = `${nameWithoutExt}_(${counter})${ext}`
            finalPath = path.join(targetDir, newFileName)
            counter++
          } catch {
            // 파일이 존재하지 않으면 사용 가능
            break
          }
        }

        // 파일 저장
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        await fs.writeFile(finalPath, buffer)

        results.push({
          name: file.name,
          savedAs: path.basename(finalPath),
          success: true,
          size: file.size
        })

      } catch (error) {
        console.error(`파일 업로드 오류 (${file.name}):`, error)
        results.push({
          name: file.name,
          success: false,
          error: error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다."
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount

    return NextResponse.json({
      message: `업로드 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
      results,
      successCount,
      failCount
    })

  } catch (error) {
    console.error('파일 업로드 API 오류:', error)
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// 업로드 제한 정보를 반환하는 GET 메서드
export async function GET() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: Math.round(MAX_FILE_SIZE / 1024 / 1024),
    allowedExtensions: ALLOWED_EXTENSIONS
  })
}
