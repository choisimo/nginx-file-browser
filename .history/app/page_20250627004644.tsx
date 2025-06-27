"use client"

import { useState, useEffect, useCallback } from "react"
import AIChatbot, { AIChatbotHandle } from "@/components/AIChatbot"
import FilePreview from "@/components/FilePreview"
import FileUpload from "@/components/FileUpload"
import React, { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  File,
  Folder,
  Download,
  Copy,
  Search,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
  Settings,
  Archive,
  CheckSquare,
  Square,
  Eye,
  Upload,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import SettingsDialog from "@/components/SettingsDialog"

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
  const aiChatbotRef = useRef<AIChatbotHandle>(null);

  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPath, setCurrentPath] = useState("/")
  const [viewMode, setViewMode] = useState<"pagination" | "infinite">("pagination")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const { toast } = useToast()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<{path: string, name: string, extension: string} | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportSource = async () => {
    setIsExporting(true)
    toast({ title: "소스 코드 내보내기 시작", description: "프로젝트 파일들을 압축하고 있습니다..." })
    try {
      const response = await fetch('/api/export/source');
      if (!response.ok) {
        throw new Error('소스 코드 생성에 실패했습니다.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-source.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "내보내기 완료", description: "소스 코드가 성공적으로 다운로드되었습니다." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({ title: "내보내기 실패", description: errorMessage, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const fetchFiles = useCallback(
    async (path: string, page = 1, append = false) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          path,
          page: page.toString(),
          search: searchTerm,
          limit: viewMode === "pagination" ? "20" : "10",
        })

        const response = await fetch(`/api/files?${params}`)
        const data: FileListResponse = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`)
        }

        // 데이터 구조 검증
        if (!data || !Array.isArray(data.files)) {
          console.error("Invalid API response:", data)
          setFiles([])
          setError("잘못된 응답 형식입니다.")
          return
        }

        if (append) {
          setFiles((prev) => [...(prev || []), ...data.files])
        } else {
          setFiles(data.files || [])
        }

        setTotalPages(Math.ceil((data.total || 0) / (viewMode === "pagination" ? 20 : 10)))
        setHasMore(data.hasMore || false)
      } catch (error) {
        console.error("Fetch files error:", error)
        const errorMessage = error instanceof Error ? error.message : "파일 목록을 불러오는데 실패했습니다."
        setError(errorMessage)
        setFiles([])
        toast({
          title: "오류",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [searchTerm, viewMode, toast],
  )

  useEffect(() => {
    setCurrentPage(1)
    setFiles([])
    fetchFiles(currentPath, 1)
  }, [currentPath, searchTerm, viewMode, fetchFiles])

  const handleRetry = () => {
    fetchFiles(currentPath, currentPage)
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchFiles(currentPath, nextPage, true)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchFiles(currentPath, page)
  }

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath)
    setCurrentPage(1)
    setSelectedFiles(new Set()) // 경로 변경 시 선택 초기화
  }

  const handleBackClick = () => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/"
    setCurrentPath(parentPath)
    setCurrentPage(1)
    setSelectedFiles(new Set()) // 경로 변경 시 선택 초기화
  }

  // 파일 선택 관련 함수들
  const handleFileSelect = (filePath: string, index: number, event: React.MouseEvent) => {
    const newSelected = new Set(selectedFiles)
    
    if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift + 클릭: 범위 선택
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      for (let i = start; i <= end; i++) {
        if (files[i]) {
          newSelected.add(files[i].path)
        }
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + 클릭: 개별 선택/해제
      if (newSelected.has(filePath)) {
        newSelected.delete(filePath)
      } else {
        newSelected.add(filePath)
      }
    } else {
      // 일반 클릭: 단일 선택
      newSelected.clear()
      newSelected.add(filePath)
    }
    
    setSelectedFiles(newSelected)
    setLastSelectedIndex(index)
  }

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map(file => file.path)))
    }
  }

  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) {
      toast({
        title: "알림",
        description: "다운로드할 파일을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/download/zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths: Array.from(selectedFiles) }),
      })

      if (!response.ok) {
        throw new Error('압축 다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `files_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "다운로드 완료",
        description: `${selectedFiles.size}개 파일이 압축되어 다운로드되었습니다.`,
      })
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: error instanceof Error ? error.message : "압축 다운로드에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleFilePreview = (file: FileItem) => {
    const previewableExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "txt", "md", "json", "xml", "yaml", "yml", "csv", "js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "h", "cs", "php", "rb", "go", "rs", "sh", "css", "html", "vue", "pdf"]
    
    if (file.extension && previewableExtensions.includes(file.extension.toLowerCase())) {
      setPreviewFile({
        path: file.path,
        name: file.name,
        extension: file.extension
      })
    } else {
      toast({
        title: "미리보기 불가",
        description: "이 파일 형식은 미리보기를 지원하지 않습니다.",
        variant: "destructive",
      })
    }
  }

  const handleUploadComplete = () => {
    setIsUploadOpen(false)
    fetchFiles(currentPath, currentPage) // 파일 목록 새로고침
  }

  const copyDownloadLink = async (filePath: string) => {
    const downloadUrl = `${window.location.origin}/api/download?path=${encodeURIComponent(filePath)}`
    try {
      await navigator.clipboard.writeText(downloadUrl)
      toast({
        title: "복사 완료",
        description: "다운로드 링크가 클립보드에 복사되었습니다.",
      })
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "링크 복사에 실패했습니다.",
        variant: "destructive",
      })
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

    const ext = file.extension?.toLowerCase()
    if (ext && ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return <File className="h-5 w-5 text-green-500" />
    } else if (ext && ["pdf"].includes(ext)) {
      return <File className="h-5 w-5 text-red-500" />
    } else if (ext && ["txt", "md"].includes(ext)) {
      return <File className="h-5 w-5 text-gray-500" />
    } else if (ext && ["json", "xml"].includes(ext)) {
      return <File className="h-5 w-5 text-orange-500" />
    }
    return <File className="h-5 w-5 text-gray-400" />
  }

  const breadcrumbs = currentPath.split("/").filter(Boolean)

  return (
    <>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-balance">파일 브라우저</h1>
              <p className="text-muted-foreground text-balance">nginx 정적 파일 탐색기</p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleExportSource} disabled={isExporting} variant="outline" size="sm" className="gap-2">
                {isExporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                소스 코드 내보내기
              </Button>
              <Button
                variant={viewMode === "pagination" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("pagination")}
                className="gap-2"
              >
                <Grid className="h-4 w-4" />
                페이지네이션
              </Button>
              <Button
                variant={viewMode === "infinite" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("infinite")}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                무한스크롤
              </Button>
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

          {/* Navigation */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Button variant="ghost" size="sm" onClick={handleBackClick} disabled={currentPath === "/"}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1 text-sm">
              <span className="cursor-pointer hover:underline" onClick={() => setCurrentPath("/")}>
                root
              </span>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span>/</span>
                  <span
                    className="cursor-pointer hover:underline"
                    onClick={() => setCurrentPath("/" + breadcrumbs.slice(0, index + 1).join("/"))}
                  >
                    {crumb}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="파일 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 선택된 파일 정보 및 일괄 작업 */}
          {files.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedFiles.size === files.length ? (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  {selectedFiles.size === files.length ? "전체 해제" : "전체 선택"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.size > 0 ? `${selectedFiles.size}개 파일 선택됨` : `총 ${files.length}개 파일`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  파일 업로드
                </Button>
                {selectedFiles.size > 0 && (
                  <Button variant="outline" size="sm" onClick={handleBulkDownload}>
                    <Archive className="h-4 w-4 mr-2" />
                    선택 파일 압축 다운로드
                  </Button>
                )}
              </div>
            </div>
          )}

            {/* File List */}
            <div className="space-y-2">
              {Array.isArray(files) &&
                files.map((file, index) => (
                  <Card 
                    key={`${file.path}-${index}`} 
                    className={`hover:shadow-lg transition-shadow border ${selectedFiles.has(file.path) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedFiles.has(file.path)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedFiles)
                              if (checked) {
                                newSelected.add(file.path)
                              } else {
                                newSelected.delete(file.path)
                              }
                              setSelectedFiles(newSelected)
                              setLastSelectedIndex(index)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${file.name}`}
                          />
                          {getFileIcon(file)}
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={(e) => handleFileSelect(file.path, index, e)}
                          >
                            <div className="flex items-center gap-2">
                              <h3
                                className="font-medium truncate hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (file.type === "directory") {
                                    handleFolderClick(file.path)
                                  }
                                }}
                              >
                                {file.name}
                              </h3>
                              {file.extension && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {file.extension.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>{formatFileSize(file.size)}</span>
                              <span>{new Date(file.lastModified).toLocaleString("ko-KR")}</span>
                            </div>
                          </div>
                        </div>
                        {/* 파일 액션 버튼 및 AI 분석 버튼 */}
                        {file.type === "file" && (
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Button variant="ghost" size="sm" onClick={(e) => {
                              e.stopPropagation()
                              handleFilePreview(file)
                            }} className="gap-2">
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">미리보기</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => {
                              e.stopPropagation()
                              copyDownloadLink(file.path)
                            }} className="gap-2">
                              <Copy className="h-4 w-4" />
                              <span className="hidden sm:inline">링크 복사</span>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="gap-2">
                              <a href={`/api/download?path=${encodeURIComponent(file.path)}`} download>
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">다운로드</span>
                              </a>
                            </Button>
                            {(["txt", "md", "js", "ts", "tsx", "json", "py", "java", "c", "cpp", "html", "css", "sh", "go", "rs", "php", "rb", "xml", "yml", "yaml"].includes(file.extension || "")) && (
                              <Button variant="ghost" size="sm" onClick={async (e) => {
                                e.stopPropagation()
                                const res = await fetch(`/api/download?path=${encodeURIComponent(file.path)}`);
                                const text = await res.text();
                                aiChatbotRef.current?.setInput(`아래 파일을 분석해줘:\n\n${text}`);
                              }} className="gap-2">
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">AI 분석</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            )}

            {/* Pagination or Load More */}
            {!loading && files.length > 0 && (
              <div className="flex justify-center pt-8">
                {viewMode === "pagination" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>이전</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = Math.max(1, currentPage - 2) + i
                        if (page > totalPages) return null

                        return (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="icon"
                            onClick={() => handlePageChange(page)}
                            className="h-8 w-8"
                          >
                            {page}
                          </Button>
                        )
                      })}

                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <MoreHorizontal className="h-4 w-4" />
                          <Button variant="outline" size="icon" onClick={() => handlePageChange(totalPages)} className="h-8 w-8">
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      <span>다음</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  hasMore && (
                    <Button onClick={handleLoadMore} disabled={loading} variant="outline">
                      더 보기
                    </Button>
                  )
                )}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && (!files || files.length === 0) && (
              <div className="text-center py-24">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
                  <File className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">파일이 없습니다</h3>
                <p className="text-muted-foreground text-balance">
                  {searchTerm ? `"${searchTerm}"에 대한 검색 결과가 없습니다.` : "현재 폴더에 파일이 없습니다."}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* AIChatbot 전역 배치 with props */}
        <AIChatbot
          ref={aiChatbotRef}
          faqList={[
            '공개 파일 디렉토리에는 이미지, 문서, PDF 등 다양한 파일이 있습니다.',
            '다운로드 링크는 어떻게 복사하나요? → 파일명 우측 "링크 복사" 버튼을 누르세요.',
            '새로운 파일을 업로드하려면 어떻게 하나요? (별도 업로드 서비스가 있을 경우 안내)',
          ]}
          serviceLinks={[
            { name: '공유 문서', url: '/shared', desc: '문서 파일 공유 및 업로드' },
            { name: '이미지 갤러리', url: '/gallery', desc: '이미지 미리보기 및 다운로드' },
            { name: '공개 파일 디렉토리', url: '/', desc: '모든 공개 파일 탐색' },
          ]}
        />
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        
        {/* File Preview Dialog */}
        <FilePreview
          filePath={previewFile?.path || null}
          fileName={previewFile?.name || ""}
          fileExtension={previewFile?.extension || ""}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
        
        {/* File Upload Dialog */}
        <FileUpload
          currentPath={currentPath}
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </>
  )
}
}
