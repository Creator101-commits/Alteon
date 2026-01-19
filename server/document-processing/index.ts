/**
 * Document Processing Service - Main Export
 * 
 * This module provides the Ephemeral Document Intelligence service
 * for Alteon V1. It handles upload, parsing, AI generation, and persistence
 * of educational assets from PDF and PPTX documents.
 * 
 * @example
 * ```typescript
 * import { documentProcessingService } from "./document-processing";
 * 
 * // Bind upload route
 * documentProcessingService.bindUploadRoute(app);
 * 
 * // Listen for progress events
 * documentProcessingService.on("progress", (event) => {
 *   console.log(`Job ${event.jobId}: ${event.phase} - ${event.progress}%`);
 * });
 * ```
 */

import { DocumentProcessingService } from "./service";
import { ephemeralStore } from "./ephemeral-store";
import { bufferArena } from "./buffer-arena";

export const documentProcessingService = new DocumentProcessingService();

export * from "./types";
export * from "./config";

// Start periodic cleanup of expired jobs and buffers
setInterval(() => {
  ephemeralStore.purgeExpired();
  bufferArena.purgeExpired();
}, 60000); // Every minute
