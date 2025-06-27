import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface FileDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    name: string;
    type: 'file' | 'directory';
    size: number;
    lastModified: string;
    path: string;
    extension?: string;
    // 추가 정보 (예시)
    md5?: string;
    sha256?: string;
    permissions?: string;
  } | null;
}

export default function FileDetailsDialog({ isOpen, onClose, file }: FileDetailsDialogProps) {
  if (!file) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{file.name} 상세 정보</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm">
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-muted-foreground">이름:</span>
            <span className="col-span-2 font-medium break-all">{file.name}</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-muted-foreground">유형:</span>
            <span className="col-span-2 font-medium">{file.type === 'directory' ? '폴더' : '파일'}</span>
          </div>
          {file.type === 'file' && (
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-muted-foreground">크기:</span>
              <span className="col-span-2 font-medium">{formatFileSize(file.size)}</span>
            </div>
          )}
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-muted-foreground">경로:</span>
            <span className="col-span-2 font-medium break-all">{file.path}</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-muted-foreground">수정일:</span>
            <span className="col-span-2 font-medium">{new Date(file.lastModified).toLocaleString()}</span>
          </div>
          {file.extension && (
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-muted-foreground">확장자:</span>
              <span className="col-span-2 font-medium">{file.extension.toUpperCase()}</span>
            </div>
          )}
          {file.md5 && (
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-muted-foreground">MD5:</span>
              <span className="col-span-2 font-medium break-all font-mono text-xs">{file.md5}</span>
            </div>
          )}
          {file.sha256 && (
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-muted-foreground">SHA256:</span>
              <span className="col-span-2 font-medium break-all font-mono text-xs">{file.sha256}</span>
            </div>
          )}
          {file.permissions && (
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-muted-foreground">권한:</span>
              <span className="col-span-2 font-medium font-mono text-xs">{file.permissions}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
