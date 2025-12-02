import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import type { Express, Request } from "express";
import multer from "multer";
import { bufferArena } from "./buffer-arena";
import { ephemeralStore } from "./ephemeral-store";
import { processingQueue } from "./queue";
import { parsePdf } from "./parsers/pdfParser";
import { parsePptx } from "./parsers/pptxParser";
import { parseXlsx } from "./parsers/xlsxParser";
import { EPHEMERAL_KEY_TTL_MS, JOB_EXPIRATION_MS, PROCESSING_LIMITS } from "./config";
import type {
  DocumentKind,
  DocumentProcessingJob,
  EducationalAssets,
  ParsedDocumentContent,
  ProcessingPhase,
  ProcessingProgressEvent,
} from "./types";
import { optimizedStorage } from "../optimized-storage";
import { generateEducationalAssets } from "./ai/generateEducationalAssets.js";
import { createDocumentSession, updateDocumentSession, saveGeneratedAssets } from "../storage";

const MEMORY_STORAGE = multer.memoryStorage();

// Store document content for chat access (expires after 30 minutes)
const documentContentStore = new Map<string, { content: string; userId: string; expiresAt: number }>();

type ExpressApp = Express;
interface MinimalMulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

type FileRequest = Request & { file?: MinimalMulterFile };

export class DocumentProcessingService extends EventEmitter {
  private uploadMiddleware = multer({
    storage: MEMORY_STORAGE,
    limits: {
      fileSize: PROCESSING_LIMITS.pdf.maxBytes, // Hard upper bound; type-specific validation occurs later
    },
  }).single("file");

  constructor() {
    super();
    processingQueue.registerProcessor("pdf", (job) => this.handleJob(job));
    processingQueue.registerProcessor("pptx", (job) => this.handleJob(job));
    processingQueue.registerProcessor("xlsx", (job) => this.handleJob(job));
  }

  bindUploadRoute(app: ExpressApp): void {
    // Upload endpoint
    app.post("/api/document-intel/sessions", (req, res) => {
      this.uploadMiddleware(req as FileRequest, res, async (uploadErr: unknown) => {
        if (uploadErr) {
          const err = uploadErr as Error;
          res.status(400).json({ message: err.message || "Document upload failed" });
          return;
        }

        const request = req as FileRequest;
        const file = request.file;
        const userId = (req.headers["x-user-id"] || req.headers["user-id"] || "").toString();
        if (!userId) {
          res.status(401).json({ message: "Authentication required" });
          return;
        }

        if (!file) {
          res.status(400).json({ message: "No file uploaded" });
          return;
        }

        try {
          const job = await this.createJob(userId, file.originalname, file.mimetype, file.buffer);
          res.status(201).json({ jobId: job.id, phase: job.phase, createdAt: job.createdAt });
        } catch (error) {
          console.error("Failed to create document processing job", error);
          res.status(400).json({ message: (error as Error).message });
        }
      });
    });

    // Get document content endpoint
    app.get("/api/document-intel/sessions/:jobId/content", (req, res) => {
      const userId = (req.headers["x-user-id"] || req.headers["user-id"] || "").toString();
      if (!userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const { jobId } = req.params;
      const stored = documentContentStore.get(jobId);

      if (!stored) {
        res.status(404).json({ message: "Document content not found or expired" });
        return;
      }

      if (stored.userId !== userId) {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      if (Date.now() > stored.expiresAt) {
        documentContentStore.delete(jobId);
        res.status(410).json({ message: "Document content has expired" });
        return;
      }

      res.status(200).json({ 
        jobId,
        content: stored.content,
        expiresAt: stored.expiresAt
      });
    });
  }

  private async createJob(userId: string, filename: string, mimeType: string, buffer: Buffer): Promise<DocumentProcessingJob> {
    const kind = this.resolveKind(filename, mimeType);
    this.validateFile(kind, buffer.byteLength);

    const jobId = randomUUID();
    const now = Date.now();
    const key = ephemeralStore.createKey(jobId);
    bufferArena.store(jobId, buffer, key, JOB_EXPIRATION_MS);

    const job: DocumentProcessingJob = {
      id: jobId,
      userId,
      kind,
      filename,
      byteSize: buffer.byteLength,
      phase: "received",
      createdAt: now,
      updatedAt: now,
      expiresAt: now + JOB_EXPIRATION_MS,
    };

    ephemeralStore.registerJob(job);

    await createDocumentSession({
      userId,
      jobId,
      fileName: filename,
      kind,
    });

    this.emitProgress({
      jobId,
      userId,
      phase: "received",
      detail: "Document received. Validating…",
      progress: 5,
    });

    processingQueue.enqueue(job);
    return job;
  }

  private resolveKind(filename: string, mimeType: string): DocumentKind {
    const normalized = filename.toLowerCase();
    if (mimeType === "application/pdf" || normalized.endsWith(".pdf")) return "pdf";
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      normalized.endsWith(".pptx")
    )
      return "pptx";
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      normalized.endsWith(".xlsx")
    )
      return "xlsx";
    throw new Error("Unsupported document type. Please upload a PDF, PPTX, or XLSX file.");
  }

  private validateFile(kind: DocumentKind, byteSize: number): void {
    const limits = PROCESSING_LIMITS[kind];
    if (!limits) {
      throw new Error("Unsupported document type");
    }
    if (byteSize > limits.maxBytes) {
      throw new Error(
        `Document exceeds the maximum allowed size for ${kind.toUpperCase()}. Please split the document and try again.`
      );
    }
  }

  private emitProgress(event: ProcessingProgressEvent): void {
    this.emit("progress", event);
  }

  private async handleJob(job: DocumentProcessingJob): Promise<void> {
    const key = ephemeralStore.getKey(job.id);
    if (!key) {
      throw new Error("Ephemeral key expired for job");
    }

    const buffer = bufferArena.read(job.id, key);
    if (!buffer) {
      throw new Error("Document buffer unavailable. Please re-upload the document.");
    }

    const phases: Array<{ phase: ProcessingPhase; detail: string; progress: number }> = [
      { phase: "validating", detail: "Running structural validation…", progress: 10 },
      { phase: "extracting", detail: "Extracting document contents…", progress: 40 },
      { phase: "structuring", detail: "Analyzing document structure…", progress: 55 },
      { phase: "analyzing", detail: "Generating educational insights…", progress: 80 },
      { phase: "publishing", detail: "Publishing assets to Alteon…", progress: 95 },
    ];

    const updatePhase = async (phase: ProcessingPhase, detail: string, progress: number) => {
      ephemeralStore.updateJob(job.id, { phase });
      this.emitProgress({ jobId: job.id, userId: job.userId, phase, detail, progress });
      await updateDocumentSession(job.id, {
        status: phase,
      });
    };

    try {
      for (const item of phases) {
        await updatePhase(item.phase, item.detail, item.progress);
        if (item.phase === "extracting") break; // extraction handled below separately
      }

      const parsed = await this.extract(job.kind, buffer);

      if (job.kind === "pdf" && parsed.metadata.pageCount && parsed.metadata.pageCount > PROCESSING_LIMITS.pdf.maxPages) {
        throw new Error("PDF exceeds the 25 page limit. Please upload a smaller segment.");
      }

      if (job.kind === "pptx" && parsed.metadata.slideCount && parsed.metadata.slideCount > PROCESSING_LIMITS.pptx.maxSlides) {
        throw new Error("Presentation exceeds 75 slides. Please split and retry.");
      }

      if (
        job.kind === "xlsx" &&
        parsed.metadata.worksheetCount &&
        parsed.metadata.worksheetCount > PROCESSING_LIMITS.xlsx.maxWorksheets
      ) {
        throw new Error("Spreadsheet exceeds worksheet limit. Please reduce the sheet count and retry.");
      }

      await updatePhase("completed", "Document ready for chat!", 100);

      // Format and store content for chat access (30 minute expiry)
      const formattedContent = this.formatContentForChat(parsed);
      documentContentStore.set(job.id, {
        content: formattedContent,
        userId: job.userId,
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
      });
      
      // Auto-cleanup after expiry
      setTimeout(() => {
        documentContentStore.delete(job.id);
      }, 30 * 60 * 1000);
      
      this.emitProgress({ 
        jobId: job.id, 
        userId: job.userId, 
        phase: "completed", 
        progress: 100,
        detail: `Document processed successfully. You can now ask questions about: ${parsed.metadata.title || job.filename}`
      });

      // Emit a special event with the extracted content
      this.emit("documentReady", {
        jobId: job.id,
        userId: job.userId,
        content: formattedContent,
        metadata: parsed.metadata
      });
      
      ephemeralStore.removeKey(job.id);
      bufferArena.purge(job.id);
    } catch (error) {
      console.error("Document processing failed", error);
      ephemeralStore.updateJob(job.id, { phase: "failed" });
      await updateDocumentSession(job.id, {
        status: "failed",
        error: (error as Error).message,
      });
      this.emitProgress({
        jobId: job.id,
        userId: job.userId,
        phase: "failed",
        detail: (error as Error).message,
        progress: 100,
        error: (error as Error).message,
      });
      bufferArena.purge(job.id);
      ephemeralStore.removeKey(job.id);
    }
  }

  private async extract(kind: DocumentKind, buffer: Buffer): Promise<ParsedDocumentContent> {
    switch (kind) {
      case "pdf":
        return parsePdf(buffer);
      case "pptx":
        return parsePptx(buffer);
      case "xlsx":
        return parseXlsx(buffer);
      default:
        throw new Error("Unsupported document type");
    }
  }

  private formatContentForChat(parsed: ParsedDocumentContent): string {
    // Combine all text content into a single string for chat context
    let content = '';
    
    // Add metadata
    if (parsed.metadata.title) {
      content += `Title: ${parsed.metadata.title}\n\n`;
    }
    if (parsed.metadata.author) {
      content += `Author: ${parsed.metadata.author}\n\n`;
    }
    
    // Add all text blocks with their headings
    parsed.textBlocks.forEach(block => {
      if (block.heading) {
        content += `\n## ${block.heading}\n\n`;
      }
      content += `${block.content}\n\n`;
    });
    
    // Add hierarchy information
    if (parsed.hierarchy && parsed.hierarchy.length > 0) {
      content += `\n\n--- Document Structure ---\n`;
      parsed.hierarchy.forEach(item => {
        const indent = '  '.repeat(item.level - 1);
        content += `${indent}- ${item.title}\n`;
      });
    }
    
    return content;
  }

  getDocumentContent(jobId: string): string | null {
    const job = ephemeralStore.getJob(jobId);
    if (!job) return null;
    
    // Content is stored in the job's buffer, but we've already cleaned it up
    // We need to store it differently
    return null;
  }
}

export const documentProcessingService = new DocumentProcessingService();
