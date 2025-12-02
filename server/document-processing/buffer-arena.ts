import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

interface ArenaRecord {
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
  createdAt: number;
  ttl: number;
}

class BufferArena {
  private arena = new Map<string, ArenaRecord>();

  store(jobId: string, buffer: Buffer, key: Buffer, ttlMs: number): void {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    this.arena.set(jobId, {
      iv,
      authTag,
      ciphertext,
      createdAt: Date.now(),
      ttl: ttlMs,
    });

    setTimeout(() => this.arena.delete(jobId), ttlMs + 1000);
  }

  read(jobId: string, key: Buffer): Buffer | null {
    const record = this.arena.get(jobId);
    if (!record) return null;
    if (Date.now() - record.createdAt > record.ttl) {
      this.arena.delete(jobId);
      return null;
    }

    const decipher = createDecipheriv("aes-256-gcm", key, record.iv, { authTagLength: 16 });
    decipher.setAuthTag(record.authTag);
    try {
      const decrypted = Buffer.concat([decipher.update(record.ciphertext), decipher.final()]);
      return decrypted;
    } catch (error) {
      console.error("BufferArena decryption failed", error);
      return null;
    }
  }

  purge(jobId: string): void {
    this.arena.delete(jobId);
  }

  purgeExpired(): void {
    const now = Date.now();
    for (const [jobId, record] of this.arena.entries()) {
      if (now - record.createdAt > record.ttl) {
        this.arena.delete(jobId);
      }
    }
  }
}

export const bufferArena = new BufferArena();
