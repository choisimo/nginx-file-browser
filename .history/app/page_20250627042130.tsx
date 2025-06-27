"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { File, Folder, AlertCircle, RefreshCw, Download, ChevronUp } from "lucide-react"

interface FileItem {
  name: string
  type: "file" | "directory"
  size: number
  lastModified: string
  path: string
  extension?: string
}

interface FileListResponse {
  files: FileItem[]
  total: number
  page: number
  hasMore: boolean
  error?: string
}

export default function FileExplorer() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState("/")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const fetchFiles = useCallback(
    async (path: string) => {
      setLoading(true)
      setError(null)
      setSelectedItems(new Set()) // 경로 변경 시 선택 초기화
      try {
        const params = new URLSearchParams({
          path,
          page: "1",
          limit: "20",
        })

        const response = await fetch(`/api/files?${params}`)
        const data: FileListResponse = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`)
        }

        if (!data || !Array.isArray(data.files)) {
          console.error("Invalid API response:", data)
          setFiles([])
          setError("잘못된 응답 형식입니다.")
          return
        }

        setFiles(data.files || [])
      } catch (error) {
        console.error("Fetch files error:", error)
        const errorMessage = error instanceof Error ? error.message : "파일 목록을 불러오는데 실패했습니다."
        setError(errorMessage)
        setFiles([])
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchFiles(currentPath)
  }, [currentPath, fetchFiles])

  const handleRetry = () => {
    fetchFiles(currentPath)
  }

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === "directory") {
      return <Folder className="h-5 w-5 text-blue-500" />
    }
    return <File className="h-5 w-5 text-gray-400" />
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">파일 브라우저</h1>
            <p className="text-muted-foreground">nginx 정적 파일 탐색기</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                재시도
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Path */}
        <div className="p-3 bg-muted rounded-lg">
          <span className="text-sm">현재 경로: {currentPath}</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* File List */}
        {!loading && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <Card key={`${file.path}-${index}`} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {getFileIcon(file)}
                    <div className="flex-1">
                      <h3 
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => {
                          if (file.type === "directory") {
                            handleFolderClick(file.path)
                          }
                        }}
                      >
                        {file.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{new Date(file.lastModified).toLocaleString("ko-KR")}</span>
                      </div>
                    </div>
                    {file.type === "file" && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/download?path=${encodeURIComponent(file.path)}`} download>
                          다운로드
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && files.length === 0 && (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
              <File className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">파일이 없습니다</h3>
            <p className="text-muted-foreground">현재 폴더에 파일이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
