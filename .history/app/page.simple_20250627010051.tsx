"use client"

import { useState, useEffect, useCallback } from "react"
import AIChatbot, { AIChatbotHandle } from "@/components/AIChatbot"
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
              <Card key={`${file.path}-${index}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className="font-medium truncate cursor-pointer hover:underline"
                            onClick={() => (file.type === "directory" ? handleFolderClick(file.path) : undefined)}
                          >
                            {file.name}
                          </h3>
                          {file.extension && (
                            <Badge variant="secondary" className="text-xs">
                              {file.extension.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span>{new Date(file.lastModified).toLocaleString("ko-KR")}</span>
                        </div>
                        {/* 파일 액션 버튼 */}
                        {file.type === "file" && (
                          <div className="flex items-center gap-2 mt-2">
                            <Button variant="outline" size="sm" onClick={() => copyDownloadLink(file.path)}>
                              <Copy className="h-4 w-4 mr-2" />
                              링크 복사
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`/api/download?path=${encodeURIComponent(file.path)}`} download>
                                <Download className="h-4 w-4 mr-2" />
                                다운로드
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && (!files || files.length === 0) && (
          <div className="text-center py-12">
            <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">파일이 없습니다</h3>
            <p className="text-muted-foreground">{searchTerm ? "검색 결과가 없습니다." : "이 폴더는 비어있습니다."}</p>
          </div>
        )}
      </div>
      
      {/* AIChatbot */}
      <AIChatbot
        ref={aiChatbotRef}
        faqList={[
          '공개 파일 디렉토리에는 이미지, 문서, PDF 등 다양한 파일이 있습니다.',
          '다운로드 링크는 어떻게 복사하나요? → 파일명 우측 "링크 복사" 버튼을 누르세요.',
        ]}
        serviceLinks={[
          { name: '공유 문서', url: '/shared', desc: '문서 파일 공유 및 업로드' },
          { name: '이미지 갤러리', url: '/gallery', desc: '이미지 미리보기 및 다운로드' },
          { name: '공개 파일 디렉토리', url: '/', desc: '모든 공개 파일 탐색' },
        ]}
      />
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
