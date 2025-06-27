import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Download, 
  X, 
  File, 
  Image, 
  FileText, 
  Code,
  AlertCircle,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FilePreviewProps {
  filePath: string | null
  fileName: string
  fileExtension: string
  isOpen: boolean
  onClose: () => void
}

const FilePreview: React.FC<FilePreviewProps> = ({
  filePath,
  fileName,
  fileExtension,
  isOpen,
  onClose,
}) => {
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileExtension.toLowerCase())
  const isText = ["txt", "md", "json", "xml", "yaml", "yml", "csv"].includes(fileExtension.toLowerCase())
  const isCode = ["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "h", "cs", "php", "rb", "go", "rs", "sh", "css", "html", "vue"].includes(fileExtension.toLowerCase())
  const isPdf = fileExtension.toLowerCase() === "pdf"

  useEffect(() => {
    if (!isOpen || !filePath) {
      setContent("")
      setError(null)
      return
    }

    if (isImage) {
      // 이미지는 별도 로딩 없이 src로 처리
      return
    }

    if (isText || isCode) {
      loadTextContent()
    } else if (isPdf) {
      // PDF는 iframe으로 처리
      return
    } else {
      setError("이 파일 형식은 미리보기를 지원하지 않습니다.")
    }
  }, [isOpen, filePath, fileExtension])

  const loadTextContent = async () => {
    if (!filePath) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/download?path=${encodeURIComponent(filePath)}`)
      if (!response.ok) {
        throw new Error("파일을 불러올 수 없습니다.")
      }
      
      const text = await response.text()
      setContent(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 로딩 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (filePath) {
      const link = document.createElement('a')
      link.href = `/api/download?path=${encodeURIComponent(filePath)}`
      link.download = fileName
      link.click()
    }
  }

  const renderMarkdown = (text: string) => {
    // 간단한 마크다운 렌더링 (제목, 굵은 글씨, 이탤릭, 코드블록)
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/```([\\s\\S]*?)```/gim, '<pre class="bg-gray-100 p-4 rounded mt-2 mb-2 overflow-x-auto"><code class="text-sm">$1</code></pre>')
      .replace(/\\n/g, '<br/>')
  }

  const getFileIcon = () => {
    if (isImage) return <Image className="h-4 w-4" />
    if (isText) return <FileText className="h-4 w-4" />
    if (isCode) return <Code className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {getFileIcon()}
            <DialogTitle className="truncate">{fileName}</DialogTitle>
            <Badge variant="secondary" className="text-xs">
              {fileExtension.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              다운로드
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">파일을 불러오는 중...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-48 text-center">
              <div>
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {isImage && filePath && (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={`/api/download?path=${encodeURIComponent(filePath)}`}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain"
                    onError={() => setError("이미지를 불러올 수 없습니다.")}
                  />
                </div>
              )}

              {(isText || isCode) && content && (
                <ScrollArea className="h-full w-full">
                  {fileExtension.toLowerCase() === "md" ? (
                    <div 
                      className="prose prose-sm max-w-none p-4"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                    />
                  ) : (
                    <pre className="text-sm font-mono p-4 whitespace-pre-wrap break-words">
                      {content}
                    </pre>
                  )}
                </ScrollArea>
              )}

              {isPdf && filePath && (
                <iframe
                  src={`/api/download?path=${encodeURIComponent(filePath)}`}
                  className="w-full h-full border-0"
                  title={fileName}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FilePreview
