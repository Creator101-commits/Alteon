/**
 * AiChat — Page-level orchestrator.
 *
 * All logic lives in useAiChat(); all UI sections are separate components
 * imported from ./ai-chat/.  This file wires them together.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle,
  FileText,
  History,
  ChevronDown,
} from "lucide-react";

import { useAiChat } from "./ai-chat/useAiChat";
import { ChatLandingView } from "./ai-chat/ChatLandingView";
import { ChatMessagesView } from "./ai-chat/ChatMessagesView";
import { ChatInputBar } from "./ai-chat/ChatInputBar";
import { SummarizeTab } from "./ai-chat/SummarizeTab";
import { HistoryTab } from "./ai-chat/HistoryTab";

export default function AiChat() {
  const hook = useAiChat();

  const chatMessages = hook.messages.filter((m) => !m.summaryType);

  return (
    <div className="h-full w-full bg-background overflow-hidden relative">
      {/* ─── Tab dropdown (top-right) ─────────────────────────── */}
      <div className="absolute top-2 right-2 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="bg-card/95 text-foreground border border-border hover:bg-card rounded-lg backdrop-blur-md shadow-lg"
            >
              {hook.activeTab === "chat" && (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  AI Chat
                </>
              )}
              {hook.activeTab === "summarize" && (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Summarize
                </>
              )}
              {hook.activeTab === "history" && (
                <>
                  <History className="h-4 w-4 mr-2" />
                  History
                </>
              )}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-card text-foreground border-border rounded-lg shadow-xl backdrop-blur-sm"
          >
            <DropdownMenuItem
              onClick={() => hook.setActiveTab("chat")}
              className="hover:bg-muted focus:bg-muted cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              AI Chat
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => hook.setActiveTab("summarize")}
              className="hover:bg-muted focus:bg-muted cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Summarize
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ─── Tab content ──────────────────────────────────────── */}
      <div className="h-full w-full overflow-hidden">
        {/* === Chat tab === */}
        {hook.activeTab === "chat" && (
          <div className="h-full flex flex-col relative">
            {/* Hidden multi-file upload input used by landing & input bar */}
            <input
              ref={hook.documentInputRef}
              type="file"
              accept=".pdf,.pptx"
              multiple
              onChange={hook.handleDocumentUpload}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                opacity: 0,
                pointerEvents: "none",
              }}
            />

            {chatMessages.length === 0 ? (
              <ChatLandingView
                getGreeting={hook.getGreeting}
                getUserName={hook.getUserName}
                chatInput={hook.chatInput}
                setChatInput={hook.setChatInput}
                isLoading={hook.isLoading}
                isUploadingDoc={hook.isUploadingDoc}
                uploadedDocuments={hook.uploadedDocuments}
                documentInputRef={hook.documentInputRef}
                handleChatMessage={hook.handleChatMessage}
                handleStarterPrompt={hook.handleStarterPrompt}
                removeDocument={hook.removeDocument}
              />
            ) : (
              <div
                key="chat"
                className="absolute inset-0 flex flex-col bg-background"
              >
                {/* Messages */}
                <div
                  className={cn(
                    "flex-1 p-4 md:p-6 overflow-y-auto scroll-smooth",
                    hook.isDockNav ? "pb-48" : "pb-40"
                  )}
                >
                  <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
                    <ChatMessagesView
                      messages={hook.messages}
                      isLoading={hook.isLoading}
                      messagesEndRef={hook.messagesEndRef}
                      copyToClipboard={hook.copyToClipboard}
                    />
                  </div>
                </div>

                {/* Input bar */}
                <ChatInputBar
                  chatInput={hook.chatInput}
                  setChatInput={hook.setChatInput}
                  isLoading={hook.isLoading}
                  isUploadingDoc={hook.isUploadingDoc}
                  uploadedDocuments={hook.uploadedDocuments}
                  documentInputRef={hook.documentInputRef}
                  isDockNav={hook.isDockNav}
                  handleChatMessage={hook.handleChatMessage}
                  stopResponse={hook.stopResponse}
                  removeDocument={hook.removeDocument}
                />
              </div>
            )}
          </div>
        )}

        {/* === Summarize tab === */}
        {hook.activeTab === "summarize" && (
          <SummarizeTab
            summaryType={hook.summaryType}
            setSummaryType={hook.setSummaryType}
            inputText={hook.inputText}
            setInputText={hook.setInputText}
            isLoading={hook.isLoading}
            processingStatus={hook.processingStatus}
            notes={hook.notes}
            selectedNote={hook.selectedNote}
            setSelectedNote={hook.setSelectedNote}
            showNoteSelector={hook.showNoteSelector}
            setShowNoteSelector={hook.setShowNoteSelector}
            messages={hook.messages}
            fileInputRef={hook.fileInputRef}
            messagesEndRef={hook.messagesEndRef}
            handleTextSummarize={hook.handleTextSummarize}
            handleNoteSummarize={hook.handleNoteSummarize}
            handleFileUpload={hook.handleFileUpload}
            loadNotes={hook.loadNotes}
            copyToClipboard={hook.copyToClipboard}
            getSummaryTypeIcon={hook.getSummaryTypeIcon}
            getSummaryTypeColor={hook.getSummaryTypeColor}
          />
        )}

        {/* === History tab === */}
        {hook.activeTab === "history" && (
          <HistoryTab
            summaries={hook.summaries}
            copyToClipboard={hook.copyToClipboard}
            getSummaryTypeIcon={hook.getSummaryTypeIcon}
            getSummaryTypeColor={hook.getSummaryTypeColor}
          />
        )}
      </div>
    </div>
  );
}
