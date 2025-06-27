"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { File, Folder, AlertCircle, RefreshCw, Download, ChevronUp, Archive } from "lucide-react"

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
  const [downloadingZip, setDownloadingZip] = useState(false)

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

  const handleGoBack = () => {
    if (currentPath === "/") return
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf("/")) || "/"
    setCurrentPath(parentPath)
  }

  // 개별 항목 선택/해제 핸들러
  const handleSelectItem = (itemName: string) => {
    const newSelectedItems = new Set(selectedItems)
    if (newSelectedItems.has(itemName)) {
      newSelectedItems.delete(itemName)
    } else {
      newSelectedItems.add(itemName)
    }
    setSelectedItems(newSelectedItems)
  }

  // 전체 선택/해제 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allItemNames = new Set(files.map(file => file.name))
      setSelectedItems(allItemNames)
    } else {
      setSelectedItems(new Set())
    }
  }

  const isAllSelected = files.length > 0 && selectedItems.size === files.length
  const hasSelectedItems = selectedItems.size > 0

  // 벌크 ZIP 다운로드 핸들러
  const handleBulkDownload = async () => {
    if (selectedItems.size === 0) return

    setDownloadingZip(true)
    try {
      // 선택된 항목들의 전체 경로 생성
      const selectedFiles = Array.from(selectedItems).map(itemName => {
        const fullPath = currentPath === "/" ? `/${itemName}` : `${currentPath}/${itemName}`
        return fullPath
      })

      const response = await fetch("/api/download/zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths: selectedFiles,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "ZIP 파일 생성에 실패했습니다.")
      }

      // 파일 다운로드
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `files_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // 성공 후 선택 해제
      setSelectedItems(new Set())
    } catch (error) {
      console.error("Bulk download error:", error)
      setError(error instanceof Error ? error.message : "일괄 다운로드 중 오류가 발생했습니다.")
    } finally {
      setDownloadingZip(false)
    }
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
          
          {/* 선택된 항목 정보 및 액션 */}
          {hasSelectedItems && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedItems.size}개 선택됨
              </span>
              <Button 
                variant="default" 
                size="sm"
                onClick={handleBulkDownload}
                disabled={downloadingZip}
                className="flex items-center gap-1"
              >
                <Archive className="h-4 w-4" />
                {downloadingZip ? "압축 중..." : "ZIP 다운로드"}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedItems(new Set())}
              >
                선택 해제
              </Button>
            </div>
          )}
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

        {/* Current Path with Navigation */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          {currentPath !== "/" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoBack}
              className="flex items-center gap-1"
            >
              <ChevronUp className="h-4 w-4" />
              상위 폴더
            </Button>
          )}
          <span className="text-sm">
            현재 경로: <code className="bg-background px-1 py-0.5 rounded text-xs">{currentPath}</code>
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* File List */}
        {!loading && (
          <div className="border rounded-lg overflow-hidden">
            {/* 테이블 헤더 */}
            {files.length > 0 && (
              <div className="bg-muted/50 px-4 py-3 border-b">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">
                    전체 선택 ({files.length}개 항목)
                  </span>
                </div>
              </div>
            )}
            
            {/* 파일 목록 */}
            <div className="divide-y">
              {files.map((file, index) => (
                <div 
                  key={`${file.path}-${index}`} 
                  className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${selectedItems.has(file.name) ? 'bg-primary/10' : ''}`}
                >
                  <Checkbox
                    checked={selectedItems.has(file.name)}
                    onCheckedChange={() => handleSelectItem(file.name)}
                    className="h-4 w-4"
                  />
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getFileIcon(file)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div 
                      className={`font-medium truncate ${file.type === "directory" ? "cursor-pointer hover:underline text-blue-600" : ""}`}
                      onClick={() => {
                        if (file.type === "directory") {
                          handleFolderClick(file.path)
                        }
                      }}
                    >
                      {file.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {new Date(file.lastModified).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  
                  {file.type === "file" && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/download?path=${encodeURIComponent(file.path)}`} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
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
