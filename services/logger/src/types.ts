/**
 * NOAH Logger — Types
 *
 * All logging goes through this service. Direct console.* calls are forbidden
 * by ESLint in all NOAH packages. Every log entry is a typed, structured object.
 *
 * @see Engineering Blueprint Part 06 — Logging Standards
 * @see Runtime Specification §111 — Audit Trail
 */

// ---------------------------------------------------------------------------
// Log level
// ---------------------------------------------------------------------------

export const LogLevel = {
  DEBUG: 0,
  INFO:  1,
  WARN:  2,
  ERROR: 3,
  AUDIT: 4, // Immutable audit entries — hash-chained
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]:  "INFO",
  [LogLevel.WARN]:  "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.AUDIT]: "AUDIT",
};

// ---------------------------------------------------------------------------
// Log entry
// ---------------------------------------------------------------------------

/**
 * Structured log entry. Free-text messages are forbidden — every entry
 * carries a typed code and a structured payload.
 *
 * @see Engineering Blueprint §Logging Standards
 */
export interface LogEntry {
  /** Monotonically increasing sequence number within this process */
  readonly seq:           number;
  /** Log level */
  readonly level:         LogLevel;
  /** Namespaced event code: ENGINE.OPERATION e.g. "MEMORY.RECALL_COMPLETE" */
  readonly code:          string;
  /** Human-readable message for developer tooling. Never shown to users. */
  readonly message:       string;
  /** Engine or module that produced this entry */
  readonly engineId:      string;
  /** Session ID at time of logging (empty string if pre-boot) */
  readonly sessionId:     string;
  /** Context object version at time of logging */
  readonly contextVersion:number;
  /** ISO-8601 timestamp with milliseconds */
  readonly timestamp:     string;
  /** Arbitrary structured payload — engine-specific */
  readonly payload:       Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Audit entry (immutable, hash-chained)
// ---------------------------------------------------------------------------

/**
 * Audit Trail entry. Every audit entry is linked to its predecessor by hash,
 * forming a chain that makes tampering detectable.
 *
 * @see Runtime Specification §111 — Audit Trail
 */
export interface AuditEntry extends LogEntry {
  readonly level: typeof LogLevel.AUDIT;
  /** SHA-256 hex digest of the previous audit entry's serialization */
  readonly prevHash: string;
  /** SHA-256 hex digest of THIS entry's canonical serialization (including prevHash) */
  readonly hash: string;
}

// ---------------------------------------------------------------------------
// Logger configuration
// ---------------------------------------------------------------------------

export interface LoggerConfig {
  /** Minimum level to emit. DEBUG entries are suppressed in production. */
  readonly minLevel: LogLevel;
  /** Engine name included in every entry emitted by this logger instance */
  readonly engineId: string;
  /**
   * Output destination. Defaults to process.stdout (structured JSON, one line per entry).
   * Tests inject a no-op or capture sink.
   */
  readonly sink?: LogSink;
  /** Persistent audit trail writer. If omitted, AUDIT entries go to sink only. */
  readonly auditWriter?: AuditWriter;
}

/** A sink receives serialized log entries */
export type LogSink = (entry: LogEntry) => void;

/** An audit writer persists AuditEntry objects durably */
export type AuditWriter = (entry: AuditEntry) => void | Promise<void>;
