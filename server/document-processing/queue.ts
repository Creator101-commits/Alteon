import type { DocumentProcessingJob } from "./types";

export class ProcessingQueue {
  private channelQueues: Map<string, DocumentProcessingJob[]> = new Map();
  private channelActiveCount: Map<string, number> = new Map();
  private processors: Map<string, (job: DocumentProcessingJob) => Promise<void>> = new Map();

  constructor(private channelConcurrency: Record<string, number> = { pdf: 2, pptx: 2, xlsx: 2 }) {}

  registerProcessor(channel: string, processor: (job: DocumentProcessingJob) => Promise<void>): void {
    this.processors.set(channel, processor);
  }

  enqueue(job: DocumentProcessingJob): void {
    const channel = job.kind;
    if (!this.channelQueues.has(channel)) {
      this.channelQueues.set(channel, []);
      this.channelActiveCount.set(channel, 0);
    }

    this.channelQueues.get(channel)!.push(job);
    this.processChannel(channel).catch((error) => {
      console.error("Queue channel processing error", error);
    });
  }

  async processChannel(channel: string): Promise<void> {
    const queue = this.channelQueues.get(channel) ?? [];
    const processor = this.processors.get(channel);
    if (!processor) {
      console.warn(`No processor registered for channel ${channel}`);
      return;
    }

    const concurrency = this.channelConcurrency[channel] ?? 1;
    const active = this.channelActiveCount.get(channel) ?? 0;

    if (active >= concurrency) {
      return;
    }

    const job = queue.shift();
    if (!job) {
      return;
    }

    this.channelActiveCount.set(channel, active + 1);

    processor(job)
      .catch((error) => {
        console.error(`Processor for channel ${channel} failed`, error);
      })
      .finally(() => {
        const currentActive = this.channelActiveCount.get(channel) ?? 1;
        this.channelActiveCount.set(channel, Math.max(0, currentActive - 1));
        if ((this.channelQueues.get(channel) ?? []).length > 0) {
          setImmediate(() => {
            this.processChannel(channel).catch((err) => console.error("Queue channel processing error", err));
          });
        }
      });

    if ((this.channelQueues.get(channel) ?? []).length > 0) {
      // Attempt to fill remaining concurrency slots
      setImmediate(() => {
        this.processChannel(channel).catch((err) => console.error("Queue channel processing error", err));
      });
    }
  }
}

export const processingQueue = new ProcessingQueue();
