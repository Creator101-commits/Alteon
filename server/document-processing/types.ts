import type { Note, Flashcard, Assignment } from "@shared/schema";

export type DocumentKind = "pdf" | "pptx" | "xlsx";

export interface DocumentProcessingLimits {
  pdf: {
    maxPages: number;
    maxBytes: number;
  };
  pptx: {
    maxSlides: number;
    maxBytes: number;
  };
  xlsx: {
    maxCells: number;
    maxWorksheets: number;
    maxBytes: number;
  };
}

export type ProcessingPhase =
  | "received"
  | "validating"
  | "extracting"
  | "structuring"
  | "analyzing"
  | "publishing"
  | "completed"
  | "failed";

export interface ProcessingProgressEvent {
  jobId: string;
  userId: string;
  phase: ProcessingPhase;
  detail?: string;
  progress?: number;
  etaSeconds?: number;
  error?: string;
}

export interface ParsedDocumentContent {
  kind: DocumentKind;
  textBlocks: Array<{ id: string; heading: string | null; content: string }>;
  images: Array<{ id: string; caption?: string; dataUrl?: string }>;
  tables: Array<{ id: string; title?: string; rows: string[][] }>;
  metadata: {
    title?: string;
    author?: string;
    createdAt?: string;
    updatedAt?: string;
    pageCount?: number;
    slideCount?: number;
    worksheetCount?: number;
  };
  equations: Array<{ id: string; latex: string }>;
  hierarchy: Array<{ id: string; level: number; title: string }>;
}

export interface EducationalAssets {
  notes: Note[];
  flashcards: Flashcard[];
  studyGuides: Array<{
    id: string;
    title: string;
    outline: Array<{ heading: string; summary: string; references: string[] }>;
    recommendedSchedule: Array<{ dayOffset: number; activity: string; durationMinutes: number }>;
  }>;
  assignments: Assignment[];
  chatSummary: {
    conversationId: string;
    highlights: string[];
  } | null;
}

export interface ProcessingResult {
  jobId: string;
  userId: string;
  parsed: ParsedDocumentContent;
  assets: EducationalAssets;
}

export interface EphemeralKeyRecord {
  key: Buffer;
  createdAt: number;
  expiresAt: number;
}

export interface DocumentProcessingJob {
  id: string;
  userId: string;
  kind: DocumentKind;
  filename: string;
  byteSize: number;
  phase: ProcessingPhase;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}
