import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet, apiPost } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FormattedMessage } from "@/components/ui/FormattedMessage";
import {
  Bot,
  Upload,
  FileText,
  Youtube,
  Mic,
  Send,
  Loader2,
  Download,
  Copy,
  Zap,
  List,
  FileCheck,
  BookOpen,
  PenTool,
  Calculator,
  MessageCircle,
  HelpCircle,
  Lightbulb,
  Square,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  History,
  Brain,
  Globe,
  Telescope,
} from "lucide-react";
import { groqAPI, ChatMessage as GroqChatMessage } from "@/lib/groq";
import { useToast } from "@/hooks/use-toast";
import { useActivity } from "@/contexts/ActivityContext";
import { useAuth } from "@/contexts/AuthContext";
import { getYouTubeTranscriptSafe } from "@/lib/youtubeTranscript";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  summaryType?: "quick" | "detailed" | "bullet";
  model?: string;
}

interface UploadedDocument {
  jobId: string;
  fileName: string;
  kind: "pdf" | "pptx" | "xlsx";
  phase: string;
  extractedContent?: string;
  status: "uploading" | "processing" | "ready" | "error";
}

interface Summary {
  id: string;
  title: string;
  content: string;
  summary: string;
  summaryType: "quick" | "detailed" | "bullet";
  fileType: "pdf" | "text" | "audio" | "youtube";
  timestamp: Date;
}

const STARTER_PROMPTS = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "get deep research insights",
    prompt: "I need deep research insights on this topic. Can you provide comprehensive analysis and findings?"
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "solve",
    prompt: "I need help solving a problem. Can you work through this step by step with me?"
  }
];

export default function AiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [inputText, setInputText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [summaryType, setSummaryType] = useState<"quick" | "detailed" | "bullet">("quick");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [showNoteSelector, setShowNoteSelector] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null); // Track file processing status
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { addActivity } = useActivity();
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await apiGet("/api/notes");
      if (response.ok) {
        const data = await response.json();
        setNotes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
      setNotes([]);
    }
  };

  const handleStarterPrompt = (prompt: string) => {
    setChatInput(prompt);
    // Automatically send the message after a brief delay
    setTimeout(() => {
      handleChatMessage();
    }, 100);
  };

  const stopResponse = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      toast({
        title: "Response Stopped",
        description: "AI response has been stopped",
      });
    }
  };

  const addMessage = (type: "user" | "assistant", content: string, summaryType?: "quick" | "detailed" | "bullet", model?: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      summaryType,
      model,
    };
    setMessages(prev => [...prev, message]);
  };

  const saveSummaryToDatabase = async (summary: Summary) => {
    if (!user?.uid) return;

    try {
      const summaryData = {
        title: summary.title,
        summary: summary.summary,
        originalContent: summary.content,
        summaryType: summary.summaryType,
        fileType: summary.fileType,
      };

      const response = await apiPost(`/api/users/${user.uid}/ai-summaries`, summaryData);
      
      if (response.ok) {
        console.log(' AI summary saved to database');
      } else {
        console.error('Failed to save AI summary to database:', response.status);
      }
    } catch (error) {
      console.error('Error saving AI summary to database:', error);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    addMessage("user", " Testing AI connection...");

    try {
      const response = await groqAPI.chat({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. Respond with exactly " Connection successful! AI chat is working properly." to confirm the connection.'
          },
          {
            role: 'user',
            content: 'Test connection'
          }
        ],
        maxTokens: 50,
        temperature: 0.1,
      });

      addMessage("assistant", response.content);
      toast({
        title: "Connection Test",
        description: "AI chat connection tested successfully!",
      });
    } catch (error) {
      console.error("Connection test error:", error);
      let errorMessage = " **Connection Test Failed**\n\nThe AI service is not responding properly.";
      
      if (error instanceof Error) {
        errorMessage += `\n\n**Error Details:** ${error.message}`;
      }
      
      addMessage("assistant", errorMessage);
      toast({
        title: "Connection Failed",
        description: "AI chat connection test failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatMessage = async () => {
    if (!chatInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);
    addMessage("user", chatInput);

    try {
      // Build system context with document information if available
      let systemContext = `You are a helpful AI assistant designed to help students with their academic work. Provide clear, educational, and constructive responses using rich Markdown formatting.`;
      
      if (uploadedDocument && uploadedDocument.status === "ready") {
        systemContext += `\n\n**IMPORTANT CONTEXT:** The user has uploaded a document: "${uploadedDocument.fileName}" (${uploadedDocument.kind.toUpperCase()}).`;
        
        if (uploadedDocument.extractedContent) {
          systemContext += `\n\n**DOCUMENT CONTENT:**\n${uploadedDocument.extractedContent}\n\n**INSTRUCTIONS:** When answering questions, reference the above document content directly. Provide specific information from the document, quote relevant sections when helpful, and help the user understand the content thoroughly.`;
        } else {
          systemContext += `\n\nWhen answering questions, reference this document and help the user understand its content.`;
        }
      }

      // Convert our chat messages to Groq format
      const chatHistory: GroqChatMessage[] = [
        {
          role: 'system' as const,
          content: systemContext + `

**Advanced Formatting Guidelines:**
- Use **bold** for important terms and key concepts
- Use *italics* for emphasis and definitions
- Use \`inline code\` for technical terms, commands, or formulas
- Use code blocks with syntax highlighting for multi-line code:
  \`\`\`python
  def hello_world():
      print("Hello, World!")
  \`\`\`
- Use # ## ### for headings to organize long responses
- Use numbered lists (1. 2. 3.) for sequential steps
- Use bullet points (- * •) for feature lists
- Use > blockquotes for important definitions or key concepts
- Use tables for comparisons or data:
  | Feature | Description | Example |
  |---------|-------------|---------|
  | Bold | **text** | **Important** |
- Use --- for section breaks
- Use checklists - [ ] for tasks or troubleshooting steps
- Use emoji appropriately for warnings (), tips (), success (), etc.
- Use $$math$$ for mathematical equations: $$E = mc^2$$
- Use inline math: $\\alpha + \\beta = \\gamma$
- Create Mermaid diagrams for flowcharts, sequence diagrams, etc:
  \`\`\`mermaid
  graph TD
      A[Start] --> B{Decision}
      B -->|Yes| C[Action 1]
      B -->|No| D[Action 2]
  \`\`\`
- Create callout boxes with emoji + **title** for important information:
   **Pro Tip**
  Content here
  
**Supported Programming Languages for Syntax Highlighting:**
JavaScript, TypeScript, Python, Java, C++, C#, PHP, Ruby, Go, Rust, SQL, JSON, YAML, HTML, CSS, SCSS, JSX, TSX, Vue, Svelte, Swift, Kotlin, Dart, R, MATLAB, LaTeX, Bash, Docker, Git, and many more.

**Mermaid Diagram Types:**
- Flowcharts: \`\`\`mermaid graph TD\`\`\`
- Sequence diagrams: \`\`\`mermaid sequenceDiagram\`\`\`
- Class diagrams: \`\`\`mermaid classDiagram\`\`\`
- Gantt charts: \`\`\`mermaid gantt\`\`\`
- Pie charts: \`\`\`mermaid pie\`\`\`
- Git graphs: \`\`\`mermaid gitGraph\`\`\`

Structure your responses with clear headings, proper spacing, and logical flow. Make complex topics easy to understand through good formatting. Use the advanced features to create rich, educational content.`
        },
        ...messages
          .filter(msg => msg.type !== "assistant" || !msg.summaryType) // Exclude summary responses from chat history
          .map(msg => ({
            role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
            content: msg.content
          })),
        {
          role: 'user' as const,
          content: chatInput
        }
      ];

      const response = await groqAPI.chat({
        messages: chatHistory,
        maxTokens: 1000,
        temperature: 0.7,
      });

      if (!controller.signal.aborted) {
        addMessage("assistant", response.content, undefined, response.model);
        setChatInput("");
        toast({
          title: "Success",
          description: "Message sent successfully!",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't show error
        return;
      }
      
      console.error("Chat error:", error);
      let errorMessage = "Sorry, I encountered an error while processing your message. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid API key') || error.message.includes('401')) {
          errorMessage = " **API Configuration Issue**\n\nThe Groq API key needs to be configured. Please check your settings and try again.";
        } else if (error.message.includes('404') || error.message.includes('model')) {
          errorMessage = " **Model Issue**\n\nThe AI model is currently unavailable. Please try again in a moment.";
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorMessage = " **Rate Limit**\n\nToo many requests. Please wait a moment and try again.";
        } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
          errorMessage = " **Connection Issue**\n\nUnable to connect to the AI service. Please check your internet connection and try again.";
        } else if (error.message.includes('Bad request') || error.message.includes('400')) {
          errorMessage = " **Request Error**\n\nThere was an issue with the request format. Please try rephrasing your message.";
        } else if (error.message.includes('500') || error.message.includes('server error')) {
          errorMessage = " **Server Error**\n\nThe AI service is temporarily unavailable. Please try again later.";
        } else {
          errorMessage = ` **Unexpected Error**\n\n${error.message}\n\nPlease try again or contact support if the issue persists.`;
        }
      }
      
      addMessage("assistant", errorMessage);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleTextSummarize = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to summarize",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProcessingStatus("Generating summary...");
    addMessage("user", `Summarize this text (${summaryType}): ${inputText.substring(0, 100)}...`);

    try {
      const response = await groqAPI.summarizeContent({
        content: inputText,
        type: summaryType,
        fileType: "text",
      });

      addMessage("assistant", response.summary, summaryType);

      // Save to summaries
      const summary: Summary = {
        id: Date.now().toString(),
        title: `Text Summary - ${summaryType}`,
        content: inputText,
        summary: response.summary,
        summaryType,
        fileType: "text",
        timestamp: new Date(),
      };
      setSummaries(prev => [summary, ...prev]);

      // Save to database
      await saveSummaryToDatabase(summary);

      // Add activity
      addActivity({
        label: `AI summarized text content`,
        icon: Bot,
        tone: "text-indigo-400",
        type: "ai",
        relatedId: summary.id,
        route: "/ai-chat"
      });

      setInputText("");
      toast({
        title: "Success",
        description: "Text summarized successfully!",
      });
    } catch (error) {
      console.error("Summarization error:", error);
      addMessage("assistant", "Sorry, I encountered an error while summarizing the text. Please try again.");
      toast({
        title: "Error",
        description: "Failed to summarize text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProcessingStatus(null);
    }
  };

  const handleNoteSummarize = async () => {
    if (!selectedNote) {
      toast({
        title: "Error",
        description: "Please select a note to summarize",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProcessingStatus("Generating note summary...");
    const stripHtmlTags = (html: string) => html.replace(/<[^>]+>/g, "");
    const cleanContent = stripHtmlTags(selectedNote.content);
    
    addMessage("user", `Summarize note "${selectedNote.title}" (${summaryType})`);

    try {
      const response = await groqAPI.summarizeContent({
        content: `Title: ${selectedNote.title}\n\nContent: ${cleanContent}`,
        type: summaryType,
        fileType: "text",
      });

      addMessage("assistant", response.summary, summaryType);

      // Save to summaries
      const summary: Summary = {
        id: Date.now().toString(),
        title: `Note: ${selectedNote.title} - ${summaryType}`,
        content: cleanContent,
        summary: response.summary,
        summaryType,
        fileType: "text",
        timestamp: new Date(),
      };
      setSummaries(prev => [summary, ...prev]);

      // Save to database
      await saveSummaryToDatabase(summary);

      // Add activity
      addActivity({
        label: `AI summarized note: ${selectedNote.title}`,
        icon: Bot,
        tone: "text-indigo-400",
        type: "ai",
        relatedId: summary.id,
        route: "/ai-chat"
      });

      setSelectedNote(null);
      setShowNoteSelector(false);
      toast({
        title: "Success",
        description: "Note summarized successfully!",
      });
    } catch (error) {
      console.error("Note summarization error:", error);
      addMessage("assistant", "Sorry, I encountered an error while summarizing the note. Please try again.");
      toast({
        title: "Error",
        description: "Failed to summarize note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProcessingStatus(null);
    }
  };

  const handleYoutubeSummarize = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (!user?.uid) {
      toast({
        title: "Error",
        description: "Please sign in to use this feature",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    addMessage("user", `Summarize YouTube video (${summaryType}): ${youtubeUrl}`);

    try {
      // Fetch transcript from backend with user authentication
      const transcript = await getYouTubeTranscriptSafe(youtubeUrl, user.uid);
      
      // Guard against very long transcripts
      const MAX_CHARS = 15000; // adjust to your model limits
      const trimmedTranscript = transcript.length > MAX_CHARS
        ? transcript.slice(0, MAX_CHARS)
        : transcript;
      
      // Then summarize it
      const response = await groqAPI.summarizeContent({
        content: trimmedTranscript,
        type: summaryType,
        fileType: "youtube",
      });

      addMessage("assistant", response.summary, summaryType);

      // Save to summaries
      const summary: Summary = {
        id: Date.now().toString(),
        title: `YouTube Summary - ${summaryType}`,
        content: transcript,
        summary: response.summary,
        summaryType,
        fileType: "youtube",
        timestamp: new Date(),
      };
      setSummaries(prev => [summary, ...prev]);

      // Save to database
      await saveSummaryToDatabase(summary);

      // Add activity
      addActivity({
        label: `AI summarized YouTube video`,
        icon: Bot,
        tone: "text-indigo-400",
        type: "ai",
        relatedId: summary.id,
        route: "/ai-chat"
      });

      setYoutubeUrl("");
      toast({
        title: "Success",
        description: "YouTube video summarized successfully!",
      });
    } catch (error) {
      console.error("YouTube summarization error:", error);
      const msg = error instanceof Error ? error.message : "Please check the URL and try again.";
      
      // Provide a demo mode if transcript fetching fails
      if (msg.includes("Transcript is disabled")) {
        addMessage("assistant", ` **YouTube Transcript Issue**

${msg}

**Demo Mode Available:** Would you like me to show you how the summarization works? You can:

1. **Copy and paste video content** into the text input above
2. **Upload a text file** with content you want summarized
3. **Try the AI chat** for educational assistance

**When transcripts work again:** This feature will automatically extract and summarize YouTube video content. YouTube has recently restricted access to many video transcripts, but educational channels often still work.

**Alternative:** If you have access to the video's transcript or captions, you can copy and paste that text into the "Direct Text Input" field above for summarization.`);
      } else {
        addMessage("assistant", `Sorry, I couldn't fetch or summarize the YouTube video. ${msg}`);
      }
      
      toast({
        title: "Transcript Unavailable",
        description: "Try educational videos or paste transcript text directly",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please upload a PDF, PPTX, or XLSX file",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingDoc(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/document-intel/sessions", {
        method: "POST",
        headers: {
          "x-user-id": user?.uid || "anonymous",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload document");
      }

      const data = await response.json();
      
      const doc: UploadedDocument = {
        jobId: data.jobId,
        fileName: file.name,
        kind: file.type.includes("pdf") ? "pdf" : file.type.includes("presentation") ? "pptx" : "xlsx",
        phase: data.phase,
        status: "processing",
      };

      setUploadedDocument(doc);

      // Poll for document processing status
      pollDocumentStatus(data.jobId);

      toast({
        title: "Document Uploaded",
        description: "Processing your document...",
      });
    } catch (error) {
      console.error("Document upload error:", error);
      addMessage(
        "assistant",
        "Sorry, I encountered an error while uploading the document. Please try again."
      );
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploadingDoc(false);
      if (documentInputRef.current) {
        documentInputRef.current.value = "";
      }
    }
  };

  const pollDocumentStatus = async (jobId: string) => {
    // Poll every 2 seconds for status updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/document-intel/sessions/${jobId}/content`, {
          headers: {
            "x-user-id": user?.uid || "",
          }
        });

        if (response.ok) {
          const data = await response.json();
          clearInterval(pollInterval);
          
          setUploadedDocument(prev => {
            if (prev && prev.jobId === jobId) {
              return { 
                ...prev, 
                status: "ready", 
                phase: "completed",
                extractedContent: data.content 
              };
            }
            return prev;
          });
        } else if (response.status === 404) {
          // Document not ready yet, keep polling
          console.log("Document still processing...");
        } else {
          // Error occurred
          console.error("Error fetching document:", response.statusText);
          clearInterval(pollInterval);
          setUploadedDocument(prev => prev ? { ...prev, status: "error" } : prev);
        }
      } catch (error) {
        console.error("Error polling document status:", error);
      }
    }, 2000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type - now supporting PDF, PPTX, XLSX, and TXT
    const allowedTypes = [
      "text/plain", 
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please upload a PDF, PPTX, XLSX, or TXT file",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProcessingStatus("Uploading document...");
    addMessage("user", `Summarize file (${summaryType}): ${file.name}`);

    try {
      let content = "";
      let fileType: "pdf" | "text" | "audio" | "youtube" = "text";
      
      if (file.type === "text/plain") {
        // Handle text files directly
        setProcessingStatus("Reading text file...");
        content = await file.text();
        fileType = "text";
      } else {
        // Handle PDF, PPTX, XLSX using document processing service
        setProcessingStatus("Uploading document...");
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch("/api/document-intel/sessions", {
          method: "POST",
          headers: {
            "x-user-id": user?.uid || "",
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload document");
        }

        const uploadData = await uploadResponse.json();
        const jobId = uploadData.jobId;

        setProcessingStatus("Processing document...");

        // Poll for document content
        let documentReady = false;
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds maximum

        while (!documentReady && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          attempts++;
          setProcessingStatus(`Extracting content... (${Math.round((attempts / maxAttempts) * 100)}%)`);

          try {
            const contentResponse = await fetch(`/api/document-intel/sessions/${jobId}/content`, {
              headers: {
                "x-user-id": user?.uid || "",
              }
            });

            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              content = contentData.content;
              documentReady = true;
              
              // Determine file type
              if (file.type === "application/pdf") {
                fileType = "pdf";
              } else if (file.type.includes("presentation")) {
                fileType = "pdf"; // Use pdf type for presentation
              } else if (file.type.includes("spreadsheet")) {
                fileType = "pdf"; // Use pdf type for spreadsheet
              }
            }
          } catch (error) {
            console.log("Still processing...", error);
          }
        }

        if (!documentReady) {
          throw new Error("Document processing timeout. Please try again.");
        }
      }

      setProcessingStatus("Generating summary...");

      // Generate summary using Groq
      const response = await groqAPI.summarizeContent({
        content,
        type: summaryType,
        fileType,
      });

      addMessage("assistant", response.summary, summaryType);

      // Save to summaries
      const summary: Summary = {
        id: Date.now().toString(),
        title: `${file.name} - ${summaryType}`,
        content,
        summary: response.summary,
        summaryType,
        fileType,
        timestamp: new Date(),
      };
      setSummaries(prev => [summary, ...prev]);

      // Save to database
      await saveSummaryToDatabase(summary);

      toast({
        title: "Success",
        description: "File summarized successfully!",
      });
    } catch (error) {
      console.error("File summarization error:", error);
      addMessage("assistant", "Sorry, I encountered an error while processing the file. Please try again.");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProcessingStatus(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getSummaryTypeIcon = (type: "quick" | "detailed" | "bullet") => {
    switch (type) {
      case "quick":
        return <Zap className="h-4 w-4" />;
      case "detailed":
        return <FileCheck className="h-4 w-4" />;
      case "bullet":
        return <List className="h-4 w-4" />;
    }
  };

  const getSummaryTypeColor = (type: "quick" | "detailed" | "bullet") => {
    switch (type) {
      case "quick":
        return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200";
      case "detailed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200";
      case "bullet":
        return "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  // Get current time for personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getUserName = () => {
    return user?.displayName || user?.email?.split('@')[0] || "User";
  };

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Top Bar with Dropdown - Minimal */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-card/80 text-foreground border border-border hover:bg-card rounded-lg backdrop-blur-sm"
            >
              {activeTab === "chat" && (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  AI Chat
                </>
              )}
              {activeTab === "summarize" && (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Summarize
                </>
              )}
              {activeTab === "history" && (
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
              onClick={() => setActiveTab("chat")}
              className="hover:bg-muted focus:bg-muted cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              AI Chat
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setActiveTab("summarize")}
              className="hover:bg-muted focus:bg-muted cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Summarize
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-full w-full overflow-hidden">

        {activeTab === "chat" && (
          <div className="h-full flex flex-col relative">
            {/* Hidden file input - always available */}
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.pptx,.xlsx"
              onChange={handleDocumentUpload}
              style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none' }}
            />
            
            {messages.filter(msg => !msg.summaryType).length === 0 ? (
              /* Landing Page - Perfectly Centered Design */
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

                {/* v0-Style Input Box - CENTERED FOCAL POINT */}
                <div className="w-full max-w-4xl mb-6">
                  <div className="relative bg-card rounded-xl border border-border shadow-lg">
                    <div className="overflow-y-auto">
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (chatInput.trim() && !isLoading) {
                              handleChatMessage();
                            }
                          }
                        }}
                        placeholder="Ask anything..."
                        disabled={isLoading}
                        className={cn(
                          "w-full px-4 py-3",
                          "resize-none",
                          "bg-transparent",
                          "border-none",
                          "text-foreground text-sm",
                          "focus:outline-none",
                          "focus-visible:ring-0 focus-visible:ring-offset-0",
                          "placeholder:text-muted-foreground placeholder:text-sm",
                          "min-h-[60px] max-h-[200px]"
                        )}
                        style={{ overflow: "hidden" }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => documentInputRef.current?.click()}
                          disabled={isUploadingDoc}
                          className="group p-2 hover:bg-muted rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Upload PDF, PPTX, or XLSX"
                        >
                          {isUploadingDoc ? (
                            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground hidden group-hover:inline transition-opacity">
                            {isUploadingDoc ? "Uploading..." : "Attach Document"}
                          </span>
                        </button>
                        {uploadedDocument && (
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors ${
                            uploadedDocument.status === "ready" 
                              ? "bg-green-500/10 border-green-500/20" 
                              : uploadedDocument.status === "error"
                              ? "bg-destructive/10 border-destructive/20"
                              : "bg-primary/10 border-primary/20"
                          }`}>
                            {uploadedDocument.status === "processing" || uploadedDocument.status === "uploading" ? (
                              <Loader2 className="w-3 h-3 text-primary animate-spin" />
                            ) : uploadedDocument.status === "ready" ? (
                              <FileCheck className="w-3 h-3 text-green-500" />
                            ) : (
                              <FileText className="w-3 h-3 text-destructive" />
                            )}
                            <span className={`text-xs truncate max-w-[100px] ${
                              uploadedDocument.status === "ready" 
                                ? "text-green-600 dark:text-green-400" 
                                : uploadedDocument.status === "error"
                                ? "text-destructive"
                                : "text-primary"
                            }`}>
                              {uploadedDocument.fileName}
                            </span>
                            {(uploadedDocument.status === "processing" || uploadedDocument.status === "uploading") && (
                              <span className="text-xs text-muted-foreground">
                                {uploadedDocument.status === "uploading" ? "Uploading..." : "Processing..."}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleChatMessage}
                          disabled={!chatInput.trim() || isLoading}
                          className={cn(
                            "px-2 py-2 rounded-lg text-sm transition-colors border flex items-center justify-center",
                            chatInput.trim() && !isLoading
                              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                              : "text-muted-foreground border-border bg-muted"
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
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {STARTER_PROMPTS.map((prompt, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleStarterPrompt(prompt.prompt)}
                      className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {React.cloneElement(prompt.icon as React.ReactElement, { className: "w-4 h-4" })}
                      <span className="text-xs">{prompt.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Chat Interface - Smooth Transition from Center */
              <div 
                key="chat" 
                className="absolute inset-0 flex flex-col bg-background"
              >
                {/* Chat Messages Area - Fills remaining space above input */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto scroll-smooth">
                  <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
                    {messages
                      .filter(msg => !msg.summaryType)
                      .map((message, index) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} my-2`}
                        >
                          <div className={`flex ${message.type === "user" ? "flex-row-reverse" : "flex-row"} items-start gap-3 max-w-[85%] group`}>
                            {/* Avatar */}
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.type === "user" ? "bg-primary" : "bg-muted"
                            }`}>
                              {message.type === "user" ? (
                                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-primary-foreground"></div>
                              ) : (
                                <Bot className="h-4 w-4 text-foreground" />
                              )}
                            </div>
                            
                            {/* Message Content - Minimal Styling */}
                            <div className="flex-1 min-w-0">
                              <div className={`px-3 py-2 ${
                                message.type === "user"
                                  ? "bg-primary/10 text-foreground"
                                  : "text-foreground"
                              }`}>
                                {message.type === "user" ? (
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                ) : (
                                  <div className="text-sm">
                                    <FormattedMessage content={message.content} animated={true} animationSpeed={4} />
                                  </div>
                                )}
                              </div>
                              {message.type === "assistant" && (
                                <button
                                  onClick={() => copyToClipboard(message.content)}
                                  className="mt-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Copy message"
                                >
                                  <Copy className="h-3 w-3 inline mr-1" />
                                  Copy
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {/* Loading Indicator */}
                    {isLoading && (
                      <div className="flex justify-start my-2">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-foreground" />
                          </div>
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-sm text-muted-foreground">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                
                {/* Chat Input Area - Sticky Bottom */}
                <div className="sticky bottom-0 flex-shrink-0 p-4 md:p-6 border-t border-border bg-background/95 backdrop-blur-md z-20">
                  <div className="max-w-4xl mx-auto">
                    <div className="relative bg-card rounded-xl border border-border shadow-lg transition-all duration-300 hover:shadow-xl">
                      <div className="overflow-y-auto">
                        <Textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (chatInput.trim() && !isLoading) {
                                handleChatMessage();
                              }
                            }
                          }}
                          placeholder="Ask anything..."
                          disabled={isLoading}
                          className={cn(
                            "w-full px-4 py-3",
                            "resize-none",
                            "bg-transparent",
                            "border-none",
                            "text-foreground text-sm",
                            "focus:outline-none",
                            "focus-visible:ring-0 focus-visible:ring-offset-0",
                            "placeholder:text-muted-foreground placeholder:text-sm",
                            "min-h-[60px] max-h-[200px]"
                          )}
                          style={{ overflow: "hidden" }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Upload button clicked, ref:', documentInputRef.current);
                              if (documentInputRef.current) {
                                documentInputRef.current.click();
                              } else {
                                console.error('documentInputRef is null!');
                              }
                            }}
                            disabled={isUploadingDoc}
                            className="group p-2 hover:bg-muted rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            title="Upload PDF, PPTX, or XLSX"
                          >
                            {isUploadingDoc ? (
                              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground hidden group-hover:inline transition-opacity">
                              {isUploadingDoc ? "Uploading..." : "Attach Document"}
                            </span>
                          </button>
                          {uploadedDocument && (
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors ${
                              uploadedDocument.status === "ready" 
                                ? "bg-green-500/10 border-green-500/20" 
                                : uploadedDocument.status === "error"
                                ? "bg-destructive/10 border-destructive/20"
                                : "bg-primary/10 border-primary/20"
                            }`}>
                              {uploadedDocument.status === "processing" || uploadedDocument.status === "uploading" ? (
                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                              ) : uploadedDocument.status === "ready" ? (
                                <FileCheck className="w-3 h-3 text-green-500" />
                              ) : (
                                <FileText className="w-3 h-3 text-destructive" />
                              )}
                              <span className={`text-xs truncate max-w-[100px] ${
                                uploadedDocument.status === "ready" 
                                  ? "text-green-600 dark:text-green-400" 
                                  : uploadedDocument.status === "error"
                                  ? "text-destructive"
                                  : "text-primary"
                              }`}>
                                {uploadedDocument.fileName}
                              </span>
                              {(uploadedDocument.status === "processing" || uploadedDocument.status === "uploading") && (
                                <span className="text-xs text-muted-foreground">
                                  {uploadedDocument.status === "uploading" ? "Uploading..." : "Processing..."}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={isLoading ? stopResponse : handleChatMessage}
                            disabled={!chatInput.trim() && !isLoading}
                            className={cn(
                              "px-2 py-2 rounded-lg text-sm transition-colors border flex items-center justify-center",
                              chatInput.trim() && !isLoading
                                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                : isLoading
                                ? "bg-muted text-foreground border-border hover:bg-muted/80"
                                : "text-muted-foreground border-border bg-muted"
                            )}
                          >
                            {isLoading ? (
                              <Square className="w-4 h-4" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            <span className="sr-only">{isLoading ? 'Stop' : 'Send'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "summarize" && (
          <div className="h-full overflow-y-auto bg-background">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8 min-h-full">
            {/* Input Panel */}
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
              <Card className="bg-card border-border backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">Summary Settings</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose how you want your content summarized
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Summary Type</Label>
                    <Select value={summaryType} onValueChange={(v) => setSummaryType(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quick">
                          <div className="flex items-center space-x-2">
                            <Zap className="h-4 w-4" />
                            <span>Quick Summary</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="detailed">
                          <div className="flex items-center space-x-2">
                            <FileCheck className="h-4 w-4" />
                            <span>Detailed Breakdown</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="bullet">
                          <div className="flex items-center space-x-2">
                            <List className="h-4 w-4" />
                            <span>Bullet Notes</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Input Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Text Input */}
                  <div>
                    <Label>Direct Text Input</Label>
                    <Textarea
                      placeholder="Paste your text here to summarize..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      rows={4}
                    />
                    <Button
                      onClick={handleTextSummarize}
                      disabled={isLoading || !inputText.trim()}
                      className="w-full mt-2"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                      Summarize Text
                    </Button>
                  </div>

                  {/* Notes Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Select from Your Notes</Label>
                      <Button
                        onClick={loadNotes}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <Button
                        onClick={() => setShowNoteSelector(!showNoteSelector)}
                        variant="outline"
                        className="w-full justify-between"
                        disabled={isLoading}
                      >
                        <div className="flex items-center">
                          <StickyNote className="h-4 w-4 mr-2" />
                          {selectedNote ? selectedNote.title : "Choose a note to summarize"}
                        </div>
                        {showNoteSelector ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      
                      {showNoteSelector && (
                        <div className="border border-border rounded-lg p-3 bg-muted/30 max-h-60 overflow-y-auto">
                          {notes.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No notes found</p>
                              <p className="text-xs">Create some notes first to summarize them here</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {notes.map((note) => {
                                const stripHtmlTags = (html: string) => html.replace(/<[^>]+>/g, "");
                                const preview = stripHtmlTags(note.content).slice(0, 100);
                                return (
                                  <div
                                    key={note.id}
                                    className={`p-3 rounded-md border cursor-pointer transition-all hover:bg-accent/50 ${
                                      selectedNote?.id === note.id 
                                        ? "border-primary bg-primary/10" 
                                        : "border-border"
                                    }`}
                                    onClick={() => {
                                      setSelectedNote(note);
                                      setShowNoteSelector(false);
                                    }}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">
                                          {note.title || "Untitled Note"}
                                        </h4>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                          {preview}...
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                          {note.category && (
                                            <Badge variant="secondary" className="text-xs px-2 py-0">
                                              {note.category}
                                            </Badge>
                                          )}
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                      {selectedNote?.id === note.id && (
                                        <Eye className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {selectedNote && (
                        <Button
                          onClick={handleNoteSummarize}
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <StickyNote className="h-4 w-4 mr-2" />}
                          Summarize Selected Note
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <Label>File Upload</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.pptx,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document (PDF/PPTX/XLSX/TXT)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle>Summarization Results</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-generated summaries will appear here
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 pr-4 overflow-y-auto">
                    <div className="space-y-4">
                      {messages.filter(msg => msg.summaryType).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Upload a document, paste text, or share a YouTube link to get started</p>
                        </div>
                      ) : (
                        messages
                          .filter(msg => msg.summaryType) // Only show summary messages
                          .map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[90%] p-4 rounded-lg ${
                                  message.type === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted border border-border"
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    {message.type === "user" ? (
                                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    ) : (
                                      <FormattedMessage content={message.content} animated={true} animationSpeed={4} />
                                    )}
                                    {message.summaryType && message.type === "assistant" && (
                                      <Badge className={`mt-3 ${getSummaryTypeColor(message.summaryType)}`}>
                                        {getSummaryTypeIcon(message.summaryType)}
                                        <span className="ml-1 capitalize">{message.summaryType}</span>
                                      </Badge>
                                    )}
                                  </div>
                                  {message.type === "assistant" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 ml-2 flex-shrink-0"
                                      onClick={() => copyToClipboard(message.content)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                      {isLoading && (
                        <div className="flex justify-center py-8">
                          <div className="bg-card border border-border rounded-xl p-6 shadow-lg max-w-sm w-full">
                            <div className="flex flex-col items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background animate-pulse"></div>
                              </div>
                              <div className="text-center">
                                <p className="font-medium text-foreground">
                                  {processingStatus || "Processing..."}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  This may take a moment
                                </p>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="h-full overflow-y-auto bg-background">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <Card className="min-h-full flex flex-col bg-card border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Summary History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {summaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No summaries yet. Create your first summary to see it here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {summaries.map((summary) => (
                    <Card key={summary.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{summary.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {summary.timestamp.toLocaleDateString()} at {summary.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSummaryTypeColor(summary.summaryType)}>
                              {getSummaryTypeIcon(summary.summaryType)}
                              <span className="ml-1 capitalize">{summary.summaryType}</span>
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(summary.summary)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg border border-border">
                          <FormattedMessage content={summary.summary} animated={false} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
