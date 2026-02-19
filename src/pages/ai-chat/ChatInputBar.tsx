/**
 * ChatInputBar — The fixed-bottom input bar for the active chat view.
 * Includes the textarea, document upload button, uploaded document chips, and send/stop button.
 */
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Upload, Loader2, Send, Square, X, FileCheck, FileText } from "lucide-react";
import type { UploadedDocument } from "./types";
import { DocumentChip } from "./ChatLandingView";

interface ChatInputBarProps {
  chatInput: string;
  setChatInput: (v: string) => void;
  isLoading: boolean;
  isUploadingDoc: boolean;
  uploadedDocuments: UploadedDocument[];
  documentInputRef: React.RefObject<HTMLInputElement | null>;
  isDockNav: boolean;
  handleChatMessage: () => void;
  stopResponse: () => void;
  removeDocument: (jobId: string) => void;
}

export function ChatInputBar({
  chatInput,
  setChatInput,
  isLoading,
  isUploadingDoc,
  uploadedDocuments,
  documentInputRef,
  isDockNav,
  handleChatMessage,
  stopResponse,
  removeDocument,
}: ChatInputBarProps) {
  return (
    <div
      className={cn(
        "fixed left-0 right-0 p-4 md:p-6 bg-background/95 backdrop-blur-md z-20",
        isDockNav ? "bottom-20" : "bottom-0"
      )}
    >
      <div className="max-w-4xl mx-auto">
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                documentInputRef.current?.click();
              }}
              disabled={isUploadingDoc}
              className="p-2 hover:bg-muted rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer shrink-0"
              title="Upload PDF or PPTX (multiple files supported)"
            >
              {isUploadingDoc ? (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {uploadedDocuments.length > 0 && (
              <div className="flex items-center gap-1.5 flex-1 mx-2 overflow-x-auto">
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
              onClick={isLoading ? stopResponse : handleChatMessage}
              disabled={!chatInput.trim() && !isLoading}
              className={cn(
                "p-2 rounded-lg text-sm transition-colors flex items-center justify-center shrink-0",
                chatInput.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : isLoading
                    ? "bg-muted text-foreground hover:bg-muted/80"
                    : "text-muted-foreground bg-muted"
              )}
            >
              {isLoading ? (
                <Square className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="sr-only">
                {isLoading ? "Stop" : "Send"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
