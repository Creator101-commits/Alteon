/**
 * ChatLandingView — The centered welcome screen shown when no messages exist yet.
 * Includes the personalized greeting, main text input, and starter prompt buttons.
 */
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Upload,
  Loader2,
  Send,
  Square,
  FileCheck,
  FileText,
  X,
} from "lucide-react";
import { STARTER_PROMPTS } from "./constants";
import type { UploadedDocument } from "./types";

interface ChatLandingViewProps {
  getGreeting: () => string;
  getUserName: () => string;
  chatInput: string;
  setChatInput: (v: string) => void;
  isLoading: boolean;
  isUploadingDoc: boolean;
  uploadedDocuments: UploadedDocument[];
  documentInputRef: React.RefObject<HTMLInputElement | null>;
  handleChatMessage: () => void;
  handleStarterPrompt: (prompt: string) => void;
  removeDocument: (jobId: string) => void;
}

export function ChatLandingView({
  getGreeting,
  getUserName,
  chatInput,
  setChatInput,
  isLoading,
  isUploadingDoc,
  uploadedDocuments,
  documentInputRef,
  handleChatMessage,
  handleStarterPrompt,
  removeDocument,
}: ChatLandingViewProps) {
  return (
    <div
      key="landing"
      className="absolute inset-0 flex flex-col items-center justify-center w-full px-6"
    >
      {/* Personalized Greeting */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          {getGreeting()}, {getUserName()}
        </h1>
      </div>

      {/* Input Box */}
      <div className="w-full max-w-4xl mb-6">
        <div className="relative bg-card rounded-xl border border-border shadow-lg">
          <Textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim() && !isLoading) handleChatMessage();
              }
            }}
            placeholder="Ask anything..."
            disabled={isLoading}
            className={cn(
              "w-full px-4 pt-4 pb-14",
              "resize-none bg-transparent border-none",
              "text-foreground text-sm",
              "focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-muted-foreground placeholder:text-sm",
              "min-h-[80px] max-h-[200px]"
            )}
          />

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-3">
            <button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              disabled={isUploadingDoc}
              className="p-2 hover:bg-muted rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 shrink-0"
              title="Upload PDF or PPTX (multiple files supported)"
            >
              {isUploadingDoc ? (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {uploadedDocuments.length > 0 && (
              <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                {uploadedDocuments.map((doc) => (
                  <DocumentChip
                    key={doc.jobId}
                    doc={doc}
                    onRemove={removeDocument}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleChatMessage}
              disabled={!chatInput.trim() || isLoading}
              className={cn(
                "p-2 rounded-lg text-sm transition-colors flex items-center justify-center shrink-0 ml-auto",
                chatInput.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground bg-muted"
              )}
            >
              {isLoading ? (
                <Square className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="sr-only">Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Starter Prompt Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {STARTER_PROMPTS.map((prompt, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleStarterPrompt(prompt.prompt)}
            className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            {React.cloneElement(prompt.icon as React.ReactElement, {
              className: "w-4 h-4",
            })}
            <span className="text-xs">{prompt.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Small chip showing an uploaded document's status */
export function DocumentChip({
  doc,
  onRemove,
}: {
  doc: UploadedDocument;
  onRemove: (jobId: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors shrink-0 ${
        doc.status === "ready"
          ? "bg-green-500/10 border-green-500/20"
          : doc.status === "error"
            ? "bg-destructive/10 border-destructive/20"
            : "bg-primary/10 border-primary/20"
      }`}
    >
      {doc.status === "processing" || doc.status === "uploading" ? (
        <Loader2 className="w-3 h-3 text-primary animate-spin" />
      ) : doc.status === "ready" ? (
        <FileCheck className="w-3 h-3 text-green-500" />
      ) : (
        <FileText className="w-3 h-3 text-destructive" />
      )}
      <span
        className={`text-xs truncate max-w-[80px] ${
          doc.status === "ready"
            ? "text-green-600 dark:text-green-400"
            : doc.status === "error"
              ? "text-destructive"
              : "text-primary"
        }`}
      >
        {doc.fileName}
      </span>
      <button
        type="button"
        onClick={() => onRemove(doc.jobId)}
        className="ml-0.5 p-0.5 hover:bg-muted rounded transition-colors"
        title="Remove file"
      >
        <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
}
