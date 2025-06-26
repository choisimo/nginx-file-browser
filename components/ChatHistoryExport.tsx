import React from "react";

export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

interface ChatHistoryExportProps {
  messages: ChatMessage[];
}

function toTxt(messages: ChatMessage[]) {
  return messages.map(m => `[${m.role}] ${m.text}`).join("\n");
}

function toMarkdown(messages: ChatMessage[]) {
  return messages.map(m => `**${m.role}**: ${m.text}`).join("\n\n");
}

function toJson(messages: ChatMessage[]) {
  return JSON.stringify(messages, null, 2);
}

export default function ChatHistoryExport({ messages }: ChatHistoryExportProps) {
  const handleExport = (type: "txt" | "md" | "json") => {
    let content = "";
    let filename = "chat-history." + type;
    if (type === "txt") content = toTxt(messages);
    if (type === "md") content = toMarkdown(messages);
    if (type === "json") content = toJson(messages);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ margin: "8px 0" }}>
      <span style={{ marginRight: 8 }}>대화 내역 저장:</span>
      <button onClick={() => handleExport("txt")}>TXT</button>
      <button onClick={() => handleExport("md")}>Markdown</button>
      <button onClick={() => handleExport("json")}>JSON</button>
    </div>
  );
}
