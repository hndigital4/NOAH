/**
 * NOAH Event Bus — Priority Queue
 *
 * Maintains six FIFO queues (P0–P5) and dequeues strictly in priority order.
 */

import type { NoahEvent, Priority } from "./types.js";

interface QueueEntry<TPayload = unknown> {
  readonly event: NoahEvent<TPayload>;
  readonly enqueuedAt: number;
}

export class PriorityQueue {
  private readonly queues: Array<Array<QueueEntry>> = [[], [], [], [], [], []];

  enqueue(event: NoahEvent): void {
    const entry: QueueEntry = { event, enqueuedAt: Date.now() };
    (this.queues[event.priority] as Array<QueueEntry>).push(entry);
  }

  dequeue(): { event: NoahEvent | null; expired: number } | null {
    let expired = 0;
    const now = Date.now();

    for (let priority = 0; priority <= 5; priority++) {
      const queue = this.queues[priority] as Array<QueueEntry>;

      while (queue.length > 0) {
        const entry = queue[0] as QueueEntry;

        if (entry.event.ttlMs !== undefined && now - entry.enqueuedAt >= entry.event.ttlMs) {
          queue.shift();
          expired++;
          continue;
        }

        queue.shift();
        return { event: entry.event, expired };
      }
    }

    return expired > 0 ? { event: null, expired } : null;
  }

  peekPriority(): Priority | null {
    for (let priority = 0; priority <= 5; priority++) {
      if ((this.queues[priority] as Array<QueueEntry>).length > 0) {
        return priority as Priority;
      }
    }
    return null;
  }

  get size(): number {
    return this.queues.reduce((sum, q) => sum + q.length, 0);
  }

  depthAt(priority: Priority): number {
    return (this.queues[priority] as Array<QueueEntry>).length;
  }

  depths(): Record<number, number> {
    return {
      0: (this.queues[0] as Array<QueueEntry>).length,
      1: (this.queues[1] as Array<QueueEntry>).length,
      2: (this.queues[2] as Array<QueueEntry>).length,
      3: (this.queues[3] as Array<QueueEntry>).length,
      4: (this.queues[4] as Array<QueueEntry>).length,
      5: (this.queues[5] as Array<QueueEntry>).length,
    };
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  clear(): void {
    for (const queue of this.queues) {
      queue.length = 0;
    }
  }
}
