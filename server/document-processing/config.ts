import type { DocumentProcessingLimits } from "./types";

export const PROCESSING_LIMITS: DocumentProcessingLimits = {
  pdf: {
    maxPages: 25,
    maxBytes: 25 * 1024 * 1024,
  },
  pptx: {
    maxSlides: 75,
    maxBytes: 40 * 1024 * 1024,
  },
  xlsx: {
    maxCells: 50_000,
    maxWorksheets: 20,
    maxBytes: 30 * 1024 * 1024,
  },
};

export const EPHEMERAL_KEY_TTL_MS = 3 * 60 * 1000; // 3 minutes
export const JOB_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
export const PROGRESS_EVENT_NAMESPACE = "document-intel";
