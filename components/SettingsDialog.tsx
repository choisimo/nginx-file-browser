import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AI_PROVIDERS = ['Gemini', 'OpenAI', 'Perplexity'];

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { pageLimit: number; viewMode: 'pagination' | 'infinite' }) => void;
  initialPageLimit: number;
  initialViewMode: 'pagination' | 'infinite';
}

export default function SettingsDialog({ isOpen, onClose, onSave, initialPageLimit, initialViewMode }: SettingsDialogProps) {
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [pageLimit, setPageLimit] = useState(initialPageLimit);
  const [viewMode, setViewMode] = useState(initialViewMode);

  useEffect(() => {
    if (isOpen) {
      const savedProvider = localStorage.getItem('aiProvider') || AI_PROVIDERS[0];
      setProvider(savedProvider);
      const savedApiKey = localStorage.getItem(`${savedProvider.toLowerCase()}ApiKey`) || '';
      setApiKey(savedApiKey);
      setPageLimit(initialPageLimit);
      setViewMode(initialViewMode);
    }
  }, [isOpen, initialPageLimit, initialViewMode]);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const savedApiKey = localStorage.getItem(`${newProvider.toLowerCase()}ApiKey`) || '';
    setApiKey(savedApiKey);
  };

  const handleSave = () => {
    localStorage.setItem('aiProvider', provider);
    localStorage.setItem(`${provider.toLowerCase()}ApiKey`, apiKey);
    onSave({ pageLimit, viewMode });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ai-provider">AI 공급자</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="ai-provider">
                <SelectValue placeholder="AI 공급자를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key">API 키</Label>
            <Input
              id="api-key"
              type="password"
              placeholder={`${provider} API 키를 입력하세요`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-limit">페이지당 파일 수</Label>
            <Select value={String(pageLimit)} onValueChange={(value) => setPageLimit(Number(value))}>
              <SelectTrigger id="page-limit">
                <SelectValue placeholder="페이지당 파일 수" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="view-mode">기본 보기 모드</Label>
            <Select value={viewMode} onValueChange={(value: 'pagination' | 'infinite') => setViewMode(value)}>
              <SelectTrigger id="view-mode">
                <SelectValue placeholder="보기 모드" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pagination">페이지네이션</SelectItem>
                <SelectItem value="infinite">무한 스크롤</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
