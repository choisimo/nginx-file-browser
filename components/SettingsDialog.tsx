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
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedProvider = localStorage.getItem('aiProvider') || AI_PROVIDERS[0];
      setProvider(savedProvider);
      const savedApiKey = localStorage.getItem(`${savedProvider.toLowerCase()}ApiKey`) || '';
      setApiKey(savedApiKey);
    }
  }, [isOpen]);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const savedApiKey = localStorage.getItem(`${newProvider.toLowerCase()}ApiKey`) || '';
    setApiKey(savedApiKey);
  };

  const handleSave = () => {
    localStorage.setItem('aiProvider', provider);
    localStorage.setItem(`${provider.toLowerCase()}ApiKey`, apiKey);
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
