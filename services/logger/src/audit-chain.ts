/**
 * NOAH Logger — Audit Chain
 *
 * Produces a hash-chained sequence of AuditEntry records.
 * Each entry contains the SHA-256 hash of the previous entry, making
 * retrospective tampering detectable.
 *
 * @see Runtime Specification §111 — Audit Trail
 */

import { createHash } from "node:crypto";

import type { AuditEntry, LogEntry } from "./types.js";
import { LogLevel } from "./types.js";

/** Canonical JSON serialization for hashing — deterministic key order */
function canonicalize(entry: Omit<AuditEntry, "hash">): string {
  return JSON.stringify({
    seq:            entry.seq,
    level:          entry.level,
    code:           entry.code,
    message:        entry.message,
    engineId:       entry.engineId,
    sessionId:      entry.sessionId,
    contextVersion: entry.contextVersion,
    timestamp:      entry.timestamp,
    payload:        entry.payload,
    prevHash:       entry.prevHash,
  });
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** The genesis hash — used as prevHash for the very first audit entry */
const GENESIS_HASH = sha256("NOAH-AUDIT-CHAIN-GENESIS-v1");

export class AuditChain {
  private prevHash: string = GENESIS_HASH;
  private entryCount = 0;

  /**
   * Promote a LogEntry to a hash-chained AuditEntry.
   * Must be called serially — concurrent calls would produce a broken chain.
   */
  promote(entry: LogEntry): AuditEntry {
    const partial: Omit<AuditEntry, "hash"> = {
      seq:            entry.seq,
      level:          LogLevel.AUDIT,
      code:           entry.code,
      message:        entry.message,
      engineId:       entry.engineId,
      sessionId:      entry.sessionId,
      contextVersion: entry.contextVersion,
      timestamp:      entry.timestamp,
      payload:        entry.payload,
      prevHash:       this.prevHash,
    };

    const canonical = canonicalize(partial);
    const hash      = sha256(canonical);

    const auditEntry: AuditEntry = { ...partial, hash };

    this.prevHash = hash;
    this.entryCount++;

    return auditEntry;
  }

  /** Verify that an entry's hash is consistent with its content and prevHash */
  verify(entry: AuditEntry): boolean {
    const partial: Omit<AuditEntry, "hash"> = {
      seq:            entry.seq,
      level:          entry.level,
      code:           entry.code,
      message:        entry.message,
      engineId:       entry.engineId,
      sessionId:      entry.sessionId,
      contextVersion: entry.contextVersion,
      timestamp:      entry.timestamp,
      payload:        entry.payload,
      prevHash:       entry.prevHash,
    };
    const canonical = canonicalize(partial);
    return sha256(canonical) === entry.hash;
  }

  get count(): number {
    return this.entryCount;
  }

  get currentHash(): string {
    return this.prevHash;
  }
}
