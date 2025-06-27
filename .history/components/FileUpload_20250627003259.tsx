import React, { useState, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Upload, 
  X, 
  File, 
  AlertCircle, 
  CheckCircle, 
  Trash2,
  Plus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  currentPath: string
  isOpen: boolean
  onClose: () => void
  onUploadComplete: () => void
}

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  savedAs?: string
}

interface UploadLimits {
  maxFileSize: number
  maxFileSizeMB: number
  allowedExtensions: string[]
}

const FileUpload: React.FC<FileUploadProps> = ({
  currentPath,
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadLimits, setUploadLimits] = useState<UploadLimits | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 업로드 제한 정보 가져오기
  React.useEffect(() => {
    if (isOpen) {
      fetchUploadLimits()
    }
  }, [isOpen])

  const fetchUploadLimits = async () => {
    try {
      const response = await fetch('/api/upload')
      const limits = await response.json()
      setUploadLimits(limits)
    } catch (error) {
      console.error('Failed to fetch upload limits:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    if (!uploadLimits) return null

    // 파일 크기 검증
    if (file.size > uploadLimits.maxFileSize) {
      return `파일 크기가 너무 큽니다. (최대 ${uploadLimits.maxFileSizeMB}MB)`
    }

    // 파일 확장자 검증
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !uploadLimits.allowedExtensions.includes(fileExtension)) {
      return `허용되지 않는 파일 형식입니다. 허용: ${uploadLimits.allowedExtensions.join(', ')}`
    }

    return null
  }

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const newFiles: UploadFile[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const error = validateFile(file)
      
      newFiles.push({
        file,
        id: `${file.name}-${Date.now()}-${i}`,
        status: error ? 'error' : 'pending',
        progress: 0,
        error: error || undefined
      })
    }

    setSelectedFiles(prev => [...prev, ...newFiles])
  }, [uploadLimits])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFiles = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('path', currentPath)
      
      pendingFiles.forEach(uploadFile => {
        formData.append('files', uploadFile.file)
      })

      // 업로드 상태 업데이트
      setUploadFiles(prev => prev.map(f => 
        f.status === 'pending' ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ))

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '업로드에 실패했습니다.')
      }

      // 결과에 따라 상태 업데이트
      setUploadFiles(prev => prev.map(uploadFile => {
        if (uploadFile.status === 'uploading') {
          const resultItem = result.results.find((r: any) => r.name === uploadFile.file.name)
          return {
            ...uploadFile,
            status: resultItem?.success ? 'success' as const : 'error' as const,
            progress: 100,
            error: resultItem?.error,
            savedAs: resultItem?.savedAs
          }
        }
        return uploadFile
      }))

      toast({
        title: "업로드 완료",
        description: result.message,
      })

      // 성공한 파일이 있으면 목록 새로고침
      if (result.successCount > 0) {
        setTimeout(() => {
          onUploadComplete()
        }, 1000)
      }

    } catch (error) {
      console.error('Upload error:', error)
      setUploadFiles(prev => prev.map(f => 
        f.status === 'uploading' ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : '업로드 실패' } : f
      ))
      
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setUploadFiles([])
      onClose()
    }
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  const pendingCount = uploadFiles.filter(f => f.status === 'pending').length
  const successCount = uploadFiles.filter(f => f.status === 'success').length
  const errorCount = uploadFiles.filter(f => f.status === 'error').length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            파일 업로드
            <Badge variant="outline" className="text-xs">
              {currentPath === '/' ? 'root' : currentPath}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* 업로드 제한 정보 */}
          {uploadLimits && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                최대 파일 크기: {uploadLimits.maxFileSizeMB}MB | 
                허용 형식: {uploadLimits.allowedExtensions.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* 드래그 앤 드롭 영역 */}
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              파일을 여기로 드래그하거나 클릭하여 선택하세요
            </p>
            <p className="text-sm text-muted-foreground">
              여러 파일을 동시에 선택할 수 있습니다
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {/* 파일 목록 */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  선택된 파일 ({uploadFiles.length}개)
                </h3>
                {!isUploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadFiles([])}
                  >
                    전체 삭제
                  </Button>
                )}
              </div>

              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {uploadFiles.map((uploadFile) => (
                    <div
                      key={uploadFile.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      {getStatusIcon(uploadFile.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {uploadFile.file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(uploadFile.file.size)}
                          </span>
                        </div>
                        
                        {uploadFile.status === 'uploading' && (
                          <Progress value={uploadFile.progress} className="mt-1" />
                        )}
                        
                        {uploadFile.error && (
                          <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                        )}
                        
                        {uploadFile.savedAs && uploadFile.savedAs !== uploadFile.file.name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            저장됨: {uploadFile.savedAs}
                          </p>
                        )}
                      </div>
                      
                      {!isUploading && uploadFile.status !== 'success' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* 업로드 상태 정보 */}
          {uploadFiles.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>대기: {pendingCount}</span>
              <span>성공: {successCount}</span>
              <span>실패: {errorCount}</span>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {isUploading ? "업로드 중..." : "닫기"}
          </Button>
          <Button 
            onClick={uploadFiles} 
            disabled={pendingCount === 0 || isUploading}
          >
            {isUploading ? (
              <>업로드 중...</>
            ) : (
              <>업로드 ({pendingCount}개)</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FileUpload
