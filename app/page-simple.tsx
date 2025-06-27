"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { File, Folder } from "lucide-react"

interface FileItem {
  name: string
  type: "file" | "directory"
  size: number
  lastModified: string
  path: string
}

export default function FileExplorer() {
  const [currentPath, setCurrentPath] = useState("/")
  
  // Mock data for testing
  const mockFiles: FileItem[] = [
    {
      name: "documents",
      type: "directory",
      size: 0,
      lastModified: new Date().toISOString(),
      path: "/documents"
    },
    {
      name: "test.txt",
      type: "file", 
      size: 1024,
      lastModified: new Date().toISOString(),
      path: "/test.txt"
    }
  ]

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

        {/* Current Path */}
        <div className="p-3 bg-muted rounded-lg">
          <span className="text-sm">현재 경로: {currentPath}</span>
        </div>

        {/* File List */}
        <div className="space-y-2">
          {mockFiles.map((file, index) => (
            <Card key={`${file.path}-${index}`} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {getFileIcon(file)}
                  <div className="flex-1">
                    <h3 className="font-medium">{file.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{new Date(file.lastModified).toLocaleString("ko-KR")}</span>
                    </div>
                  </div>
                  {file.type === "file" && (
                    <Button variant="outline" size="sm">
                      다운로드
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
