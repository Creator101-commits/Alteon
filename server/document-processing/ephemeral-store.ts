import { randomBytes } from "crypto";
import { EPHEMERAL_KEY_TTL_MS, JOB_EXPIRATION_MS } from "./config";
import type { DocumentProcessingJob, EphemeralKeyRecord, ProcessingPhase } from "./types";

class EphemeralStore {
  private keys = new Map<string, EphemeralKeyRecord>();
  private jobs = new Map<string, DocumentProcessingJob>();

  createKey(jobId: string): Buffer {
    const key = randomBytes(32);
    const now = Date.now();
    this.keys.set(jobId, {
      key,
      createdAt: now,
      expiresAt: now + EPHEMERAL_KEY_TTL_MS,
    });
    setTimeout(() => this.keys.delete(jobId), EPHEMERAL_KEY_TTL_MS + 1000);
    return key;
  }

  getKey(jobId: string): Buffer | null {
    const record = this.keys.get(jobId);
    if (!record) return null;
    if (Date.now() >= record.expiresAt) {
      this.keys.delete(jobId);
      return null;
    }
    return record.key;
  }

  removeKey(jobId: string): void {
    this.keys.delete(jobId);
  }

  registerJob(job: DocumentProcessingJob): void {
    this.jobs.set(job.id, job);
    setTimeout(() => this.jobs.delete(job.id), JOB_EXPIRATION_MS + 30_000);
  }

  updateJob(jobId: string, updates: Partial<Omit<DocumentProcessingJob, "id" | "userId" | "kind">> & { phase?: ProcessingPhase }): DocumentProcessingJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    const updated: DocumentProcessingJob = {
      ...job,
      ...updates,
      updatedAt: Date.now(),
    };
    this.jobs.set(jobId, updated);
    return updated;
  }

  getJob(jobId: string): DocumentProcessingJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  purge(jobId: string): void {
    this.jobs.delete(jobId);
    this.keys.delete(jobId);
  }

  purgeExpired(): void {
    const now = Date.now();
    // Purge expired keys
    for (const [jobId, record] of this.keys.entries()) {
      if (now >= record.expiresAt) {
        this.keys.delete(jobId);
      }
    }
    // Purge expired jobs
    for (const [jobId, job] of this.jobs.entries()) {
      if (now >= job.expiresAt) {
        this.jobs.delete(jobId);
      }
    }
  }
}

export const ephemeralStore = new EphemeralStore();
