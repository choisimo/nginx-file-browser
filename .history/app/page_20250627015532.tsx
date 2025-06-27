"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPath, setCurrentPath] = useState("/")
  const [viewMode, setViewMode] = useState<"pagination" | "infinite">("pagination")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const { toast } = useToast()

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
  }

  const handleBackClick = () => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/"
    setCurrentPath(parentPath)
    setCurrentPage(1)
  }

  const copyDownloadLink = async (filePath: string) => {
    try {
      const url = `${window.location.origin}/api/download?path=${encodeURIComponent(filePath)}`
      await navigator.clipboard.writeText(url)
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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-balance">파일 브라우저</h1>
            <p className="text-muted-foreground text-balance">nginx 정적 파일 탐색기</p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* File List */}
        <div className="space-y-2">
          {Array.isArray(files) &&
            files.map((file, index) => (
              <Card key={`${file.path}-${index}`} className="hover:shadow-lg transition-shadow border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className="font-medium truncate hover:underline cursor-pointer"
                            onClick={() => {
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
                    {/* 파일 액션 버튼 */}
                    {file.type === "file" && (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Button variant="ghost" size="sm" onClick={() => copyDownloadLink(file.path)} className="gap-2">
                          <Copy className="h-4 w-4" />
                          <span className="hidden sm:inline">링크 복사</span>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="gap-2">
                          <a href={`/api/download?path=${encodeURIComponent(file.path)}`} download>
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">다운로드</span>
                          </a>
                        </Button>
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
  )
}