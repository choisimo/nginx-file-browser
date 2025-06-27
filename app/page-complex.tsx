"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import AIChatbot, { AIChatbotHandle } from "@/components/AIChatbot"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import SettingsDialog from "@/components/SettingsDialog"
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
  Upload,
  FolderPlus,
  Pencil,
  Trash2,
  LogOut,
  Settings,
  Sparkles,
  Info,
  Tags,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileItem {
  name: string
  type: "file" | "directory"
  size: number
  lastModified: string
  path: string
  extension?: string
  isImage?: boolean;
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
  const [pageLimit, setPageLimit] = useState(20)
  const { toast } = useToast()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetailsForFile, setShowDetailsForFile] = useState<FileItem | null>(null);
  const aiChatbotRef = useRef<AIChatbotHandle>(null);

  // 설정 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          setPageLimit(settings.pageLimit || 20);
          setViewMode(settings.viewMode || 'pagination');
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  const fetchFiles = useCallback(
    async (path: string, page = 1, append = false) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          path,
          page: page.toString(),
          search: searchTerm,
          limit: viewMode === "pagination" ? pageLimit.toString() : "10",
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

        setTotalPages(Math.ceil((data.total || 0) / (viewMode === "pagination" ? pageLimit : 10)))
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
    [searchTerm, viewMode, toast, pageLimit],
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
      return <img src={`/api/thumbnail?path=${encodeURIComponent(file.path)}&size=48`} alt={file.name} className="h-12 w-12 object-cover rounded-md" />
    } else if (ext && ["pdf"].includes(ext)) {
      return <File className="h-5 w-5 text-red-500" />
    } else if (ext && ["txt", "md"].includes(ext)) {
      return <File className="h-5 w-5 text-gray-500" />
    } else if (ext && ["json", "xml"].includes(ext)) {
      return <File className="h-5 w-5 text-orange-500" />
    }
    return <File className="h-5 w-5 text-gray-400" />
  }

  const handleAnalyzeImage = async (file: FileItem) => {
    if (!file.isImage) return;

    toast({ title: "이미지 분석 중...", description: `'${file.name}' 이미지를 AI가 분석하고 있습니다.` });
    try {
      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: file.path }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '이미지 분석에 실패했습니다.');
      }

      aiChatbotRef.current?.setInput(`'${file.name}' 이미지 분석 결과:\n\n${result.analysis}`);
      toast({ title: "이미지 분석 완료", description: `'${file.name}' 이미지 분석 결과가 AI 챗봇에 전달되었습니다.` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({ title: "이미지 분석 실패", description: errorMessage, variant: "destructive" });
    }
  };

  const handleSuggestTags = async (file: FileItem) => {
    toast({ title: "태그 제안 중...", description: `'${file.name}' 파일에 대한 태그를 AI가 제안하고 있습니다.` });
    try {
      const response = await fetch('/api/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: file.path }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '태그 제안에 실패했습니다.');
      }

      const tags = result.tags.join(', ');
      aiChatbotRef.current?.setInput(`'${file.name}' 파일에 대한 태그 제안:\n\n${tags}`);
      toast({ title: "태그 제안 완료", description: `'${file.name}' 파일에 대한 태그 제안 결과가 AI 챗봇에 전달되었습니다.` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({ title: "태그 제안 실패", description: errorMessage, variant: "destructive" });
    }
  };

  const handleSaveSettings = async (settings: { pageLimit: number; viewMode: 'pagination' | 'infinite' }) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        setPageLimit(settings.pageLimit);
        setViewMode(settings.viewMode);
        toast({ title: "설정 저장 성공", description: "설정이 성공적으로 저장되었습니다." });
        fetchFiles(currentPath, 1); // 설정 변경 후 파일 목록 새로고침
      } else {
        throw new Error('설정 저장에 실패했습니다.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({ title: "설정 저장 실패", description: errorMessage, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        toast({ title: "로그아웃 성공", description: "로그인 페이지로 이동합니다." });
        window.location.href = '/login'; // 로그인 페이지로 리다이렉트
      } else {
        throw new Error('로그아웃에 실패했습니다.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({ title: "로그아웃 실패", description: errorMessage, variant: "destructive" });
    }
  };

  const handleDelete = async (pathToDelete: string) => {
    if (!confirm(`'${path.basename(pathToDelete)}'을(를) 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingFile(pathToDelete);
    setIsDeleting(true);
    toast({ title: "삭제 중...", description: `'${path.basename(pathToDelete)}'을(를) 삭제하고 있습니다.` });

    try {
      const response = await fetch('/api/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pathToDelete }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '삭제에 실패했습니다.');
      }

      toast({ title: "삭제 성공", description: `성공적으로 삭제되었습니다.` });
      fetchFiles(currentPath, currentPage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({ title: "삭제 실패", description: errorMessage, variant: "destructive" });
    } finally {
      setDeletingFile(null);
      setIsDeleting(false);
    }
  };

  const handleRename = async (oldPath: string) => {
    const newName = prompt("새로운 파일 또는 폴더의 이름을 입력하세요:", path.basename(oldPath));
    if (!newName || newName === path.basename(oldPath)) {
      return;
    }

    setRenamingFile(oldPath);
    setIsRenaming(true);
    toast({ title: "이름 변경 중...", description: `'${path.basename(oldPath)}'의 이름을 변경하고 있습니다.` });

    try {
      const response = await fetch('/api/files', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPath, newName }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '이름 변경에 실패했습니다.');
      }

      toast({ title: "이름 변경 성공", description: `성공적으로 이름을 변경했습니다.` });
      fetchFiles(currentPath, currentPage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({ title: "이름 변경 실패", description: errorMessage, variant: "destructive" });
    } finally {
      setRenamingFile(null);
      setIsRenaming(false);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt("새 폴더의 이름을 입력하세요:");
    if (!folderName) {
      return;
    }

    setIsCreatingFolder(true);
    toast({ title: "폴더 생성 중...", description: `'${folderName}' 폴더를 생성하고 있습니다.` });

    const formData = new FormData();
    formData.append("action", "create-folder");
    formData.append("path", currentPath);
    formData.append("folderName", folderName);

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '폴더 생성에 실패했습니다.');
      }

      toast({ title: "폴더 생성 성공", description: `'${folderName}' 폴더가 성공적으로 생성되었습니다.` });
      fetchFiles(currentPath, currentPage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({ title: "폴더 생성 실패", description: errorMessage, variant: "destructive" });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUpload = async (selectedFiles: FileList) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    toast({ title: "업로드 시작", description: `${selectedFiles.length}개의 파일을 업로드합니다...` });

    const formData = new FormData();
    formData.append("path", currentPath);
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        setUploadProgress(percentCompleted);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      setUploadProgress(0);
      if (xhr.status === 201) {
        toast({ title: "업로드 성공", description: `파일이 성공적으로 업로드되었습니다.` });
        fetchFiles(currentPath, currentPage);
      } else {
        const errorData = JSON.parse(xhr.responseText);
        toast({ title: "업로드 실패", description: errorData.error || '파일 업로드에 실패했습니다.', variant: "destructive" });
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      toast({ title: "업로드 실패", description: "네트워크 오류 또는 서버 응답 없음", variant: "destructive" });
    };

    xhr.send(formData);
  };

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
            <Button onClick={handleExportSource} disabled={isExporting} variant="outline" size="sm" className="gap-2">
              {isExporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              소스 코드 내보내기
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
            <Button onClick={() => setIsSettingsOpen(true)} variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              설정
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
        }

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

        {/* Action Bar */}
        <div className="flex items-center gap-2">
            <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={isUploading} variant="outline" size="sm" className="gap-2">
                {isUploading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    <Upload className="h-4 w-4" />
                )}
                업로드
            </Button>
            <input type="file" id="file-upload" multiple className="hidden" onChange={(e) => handleUpload(e.target.files!)} />
            <Button onClick={handleCreateFolder} disabled={isCreatingFolder} variant="outline" size="sm" className="gap-2">
                {isCreatingFolder ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    <FolderPlus className="h-4 w-4" />
                )}
                새 폴더
            </Button>
        </div>

        {isUploading && (
          <div className="w-full mt-4">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground mt-2">업로드 중: {uploadProgress}%</p>
          </div>
        )}

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
                        {file.isImage && (
                          <Button variant="ghost" size="sm" onClick={() => handleAnalyzeImage(file)} className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden sm:inline">AI 분석</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setShowDetailsForFile(file)} className="gap-2">
                          <Info className="h-4 w-4" />
                          <span className="hidden sm:inline">상세 정보</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRename(file.path)} disabled={isRenaming && renamingFile === file.path} className="gap-2">
                          {isRenaming && renamingFile === file.path ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                          <span className="hidden sm:inline">이름 변경</span>
                        </Button>
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
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(file.path)} disabled={isDeleting && deletingFile === file.path} className="gap-2 text-destructive hover:text-destructive">
                          {isDeleting && deletingFile === file.path ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          <span className="hidden sm:inline">삭제</span>
                        </Button>
                        {file.type === "file" && !file.isImage && (["txt", "md", "js", "ts", "tsx", "json", "py", "java", "c", "cpp", "html", "css", "sh", "go", "rs", "php", "rb", "xml", "yml", "yaml"].includes(file.extension || "")) && (
                          <Button variant="ghost" size="sm" onClick={() => handleSuggestTags(file)} className="gap-2">
                            <Tags className="h-4 w-4" />
                            <span className="hidden sm:inline">AI 태그 제안</span>
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
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialPageLimit={pageLimit}
        initialViewMode={viewMode}
      />
    </div>
  )
}