/**
 * Shared types for the AI Chat feature
 */

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  summaryType?: "quick" | "detailed" | "bullet";
  model?: string;
}

export interface UploadedDocument {
  jobId: string;
  fileName: string;
  kind: "pdf" | "pptx";
  phase: string;
  extractedContent?: string;
  status: "uploading" | "processing" | "ready" | "error";
}

export interface Summary {
  id: string;
  title: string;
  content: string;
  summary: string;
  summaryType: "quick" | "detailed" | "bullet";
  fileType: "pdf" | "text" | "audio" | "youtube";
  timestamp: Date;
}

export type SummaryType = "quick" | "detailed" | "bullet";
export type ActiveTab = "chat" | "summarize" | "history";
