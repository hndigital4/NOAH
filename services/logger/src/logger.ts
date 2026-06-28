/**
 * NOAH Logger — Core Implementation
 * @see Engineering Blueprint Part 06 — Logging Standards
 * @see Runtime Specification §111 — Audit Trail
 */

import { AuditChain } from "./audit-chain.js";
import { LogLevel, LOG_LEVEL_NAMES } from "./types.js";
import type { AuditEntry, AuditWriter, LogEntry, LoggerConfig, LogSink } from "./types.js";

const stdoutSink: LogSink = (entry: LogEntry): void => {
  process.stdout.write(JSON.stringify(entry) + "\n");
};

export class Logger {
  private readonly engineId:    string;
  private readonly minLevel:    LogLevel;
  private readonly sink:        LogSink;
  private readonly auditWriter: AuditWriter | undefined;
  private readonly chain:       AuditChain;

  private seq            = 0;
  private sessionId      = "";
  private ctxVersion     = 0;

  constructor(config: LoggerConfig) {
    this.engineId    = config.engineId;
    this.minLevel    = config.minLevel;
    this.sink        = config.sink ?? stdoutSink;
    this.auditWriter = config.auditWriter;
    this.chain       = new AuditChain();
  }

  bindSession(sessionId: string): void        { this.sessionId  = sessionId; }
  updateContextVersion(version: number): void { this.ctxVersion = version;   }

  debug(code: string, msg: string, payload: Record<string, unknown> = {}): void {
    this.write(LogLevel.DEBUG, code, msg, payload);
  }
  info(code: string, msg: string, payload: Record<string, unknown> = {}): void {
    this.write(LogLevel.INFO, code, msg, payload);
  }
  warn(code: string, msg: string, payload: Record<string, unknown> = {}): void {
    this.write(LogLevel.WARN, code, msg, payload);
  }
  error(code: string, msg: string, payload: Record<string, unknown> = {}): void {
    this.write(LogLevel.ERROR, code, msg, payload);
  }

  audit(code: string, msg: string, payload: Record<string, unknown> = {}): AuditEntry {
    const base       = this.buildEntry(LogLevel.AUDIT, code, msg, payload);
    const auditEntry = this.chain.promote(base);
    this.sink(auditEntry);
    if (this.auditWriter !== undefined) {
      const result = this.auditWriter(auditEntry);
      if (result instanceof Promise) {
        result.catch((_err: unknown) => {
          process.stderr.write(
            JSON.stringify({ critical: "AUDIT_WRITE_FAILED", code, seq: base.seq }) + "\n",
          );
        });
      }
    }
    return auditEntry;
  }

  child(namespace: string): Logger {
    const child = new Logger({
      minLevel: this.minLevel,
      engineId: `${this.engineId}.${namespace}`,
      sink:     this.sink,
      ...(this.auditWriter !== undefined ? { auditWriter: this.auditWriter } : {}),
    });
    child.sessionId  = this.sessionId;
    child.ctxVersion = this.ctxVersion;
    return child;
  }

  getAuditChainHash(): string              { return this.chain.currentHash;   }
  getAuditEntryCount(): number             { return this.chain.count;         }
  verifyAuditEntry(e: AuditEntry): boolean { return this.chain.verify(e);     }

  private write(level: LogLevel, code: string, msg: string, payload: Record<string, unknown>): void {
    if (level < this.minLevel) return;
    this.sink(this.buildEntry(level, code, msg, payload));
  }

  private buildEntry(
    level:   LogLevel,
    code:    string,
    message: string,
    payload: Record<string, unknown>,
  ): LogEntry {
    return {
      seq:            ++this.seq,
      level,
      code,
      message:        `[${LOG_LEVEL_NAMES[level]}] ${code}: ${message}`,
      engineId:       this.engineId,
      sessionId:      this.sessionId,
      contextVersion: this.ctxVersion,
      timestamp:      new Date().toISOString(),
      payload:        Object.freeze({ ...payload }),
    };
  }
}

export function createLogger(engineId: string, config: Partial<LoggerConfig> = {}): Logger {
  return new Logger({
    minLevel: config.minLevel ?? (process.env["NODE_ENV"] === "production"
      ? LogLevel.INFO : LogLevel.DEBUG),
    engineId,
    ...(config.sink        !== undefined ? { sink:        config.sink        } : {}),
    ...(config.auditWriter !== undefined ? { auditWriter: config.auditWriter } : {}),
  });
}
