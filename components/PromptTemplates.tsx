import React, { useState } from "react";

const DEFAULT_TEMPLATES = [
  {
    name: "코드 리뷰",
    content: "이 파일의 코드 리뷰 및 개선점을 알려줘.",
  },
  {
    name: "파일 요약",
    content: "이 파일의 주요 내용을 요약해줘.",
  },
  {
    name: "보안 점검",
    content: "이 파일의 보안 취약점이나 위험 요소를 찾아줘.",
  },
];

export type PromptTemplate = {
  name: string;
  content: string;
};

interface PromptTemplatesProps {
  onSelect: (template: PromptTemplate) => void;
}

export default function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");

  const addTemplate = () => {
    if (!newName || !newContent) return;
    setTemplates([...templates, { name: newName, content: newContent }]);
    setNewName("");
    setNewContent("");
  };

  const removeTemplate = (idx: number) => {
    setTemplates(templates.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, background: "#fff", maxWidth: 400 }}>
      <h3 style={{ marginBottom: 8 }}>프롬프트 템플릿</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {templates.map((tpl, idx) => (
          <li key={tpl.name} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <button onClick={() => onSelect(tpl)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <b>{tpl.name}</b>: {tpl.content}
            </button>
            <button onClick={() => removeTemplate(idx)} style={{ marginLeft: 8, color: "red", border: "none", background: "none", cursor: "pointer" }}>삭제</button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 16 }}>
        <input
          type="text"
          placeholder="템플릿 이름"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          style={{ width: "100%", marginBottom: 4 }}
        />
        <textarea
          placeholder="프롬프트 내용"
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          style={{ width: "100%", marginBottom: 4 }}
        />
        <button onClick={addTemplate} style={{ width: "100%" }}>추가</button>
      </div>
    </div>
  );
}
