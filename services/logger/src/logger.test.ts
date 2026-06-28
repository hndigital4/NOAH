import { describe, expect, it } from "vitest";

import { AuditChain } from "./audit-chain.js";
import { createLogger } from "./logger.js";
import { LogLevel } from "./types.js";
import type { AuditEntry, LogEntry } from "./types.js";

describe("Logger", () => {
  it("emits structured entries to sink", () => {
    const captured: LogEntry[] = [];
    const log = createLogger("test-engine", {
      sink: (e) => { captured.push(e); },
      minLevel: LogLevel.DEBUG,
    });

    log.debug("TEST.DEBUG", "debug message", { key: "value" });
    log.info("TEST.INFO", "info message");
    log.warn("TEST.WARN", "warn message");
    log.error("TEST.ERROR", "error message");

    expect(captured).toHaveLength(4);
    expect(captured[0]?.level).toBe(LogLevel.DEBUG);
    expect(captured[1]?.level).toBe(LogLevel.INFO);
    expect(captured[2]?.level).toBe(LogLevel.WARN);
    expect(captured[3]?.level).toBe(LogLevel.ERROR);
  });

  it("suppresses entries below minLevel", () => {
    const captured: LogEntry[] = [];
    const log = createLogger("test", {
      sink: (e) => { captured.push(e); },
      minLevel: LogLevel.WARN,
    });

    log.debug("X", "debug");
    log.info("X", "info");
    log.warn("X", "warn");
    log.error("X", "error");

    expect(captured).toHaveLength(2);
    expect(captured[0]?.level).toBe(LogLevel.WARN);
  });

  it("increments seq monotonically", () => {
    const captured: LogEntry[] = [];
    const log = createLogger("seq-test", {
      sink: (e) => { captured.push(e); },
      minLevel: LogLevel.DEBUG,
    });
    for (let i = 0; i < 5; i++) log.info("SEQ", `msg ${i}`);
    expect(captured.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5]);
  });

  it("carries engineId in every entry", () => {
    const captured: LogEntry[] = [];
    const log = createLogger("memory-engine", {
      sink: (e) => { captured.push(e); },
    });
    log.info("MEM.RECALL", "recall complete");
    expect(captured[0]?.engineId).toBe("memory-engine");
  });

  it("binds session and context version", () => {
    const captured: LogEntry[] = [];
    const log = createLogger("core", { sink: (e) => { captured.push(e); } });
    log.bindSession("session-abc");
    log.updateContextVersion(42);
    log.info("CORE.TICK", "heartbeat");

    expect(captured[0]?.sessionId).toBe("session-abc");
    expect(captured[0]?.contextVersion).toBe(42);
  });

  it("produces hash-chained audit entries", () => {
    const audited: AuditEntry[] = [];
    const log = createLogger("security", {
      sink: (e) => { if (e.level === LogLevel.AUDIT) audited.push(e as AuditEntry); },
      minLevel: LogLevel.AUDIT,
    });

    const chain = new AuditChain();

    log.audit("SEC.GATE_APPROVED", "permission granted", { resource: "entity:123" });
    log.audit("SEC.GATE_APPROVED", "permission granted", { resource: "entity:456" });
    log.audit("SEC.AUTH_SUCCESS",  "user authenticated");

    // Verify the chain structure
    expect(audited).toHaveLength(3);
    expect(audited[0]?.hash).toBeDefined();
    expect(audited[1]?.prevHash).toBe(audited[0]?.hash);
    expect(audited[2]?.prevHash).toBe(audited[1]?.hash);

    // Verify individual entries
    for (const entry of audited) {
      expect(chain.verify(entry)).toBe(true);
    }
  });

  it("child logger inherits config and namespaces engineId", () => {
    const captured: LogEntry[] = [];
    const parent = createLogger("core", { sink: (e) => { captured.push(e); } });
    const child  = parent.child("heartbeat");

    child.info("TICK", "heartbeat fired");
    expect(captured[0]?.engineId).toBe("core.heartbeat");
  });
});

describe("AuditChain", () => {
  it("verifies a valid entry", () => {
    const chain = new AuditChain();
    const base = {
      seq: 1, level: LogLevel.AUDIT as const, code: "TEST", message: "[AUDIT] TEST: msg",
      engineId: "e", sessionId: "s", contextVersion: 1,
      timestamp: new Date().toISOString(), payload: {} as Record<string, unknown>,
    };
    const entry = chain.promote(base);
    expect(chain.verify(entry)).toBe(true);
  });

  it("rejects a tampered entry", () => {
    const chain = new AuditChain();
    const base = {
      seq: 1, level: LogLevel.AUDIT as const, code: "TEST", message: "[AUDIT] TEST: msg",
      engineId: "e", sessionId: "s", contextVersion: 1,
      timestamp: new Date().toISOString(), payload: {} as Record<string, unknown>,
    };
    const entry = chain.promote(base);
    const tampered: AuditEntry = { ...entry, payload: { injected: true } };
    expect(chain.verify(tampered)).toBe(false);
  });

  it("links chain correctly across multiple entries", () => {
    const chain = new AuditChain();
    const makeBase = (seq: number) => ({
      seq, level: LogLevel.AUDIT as const, code: "TEST", message: "[AUDIT] TEST: msg",
      engineId: "e", sessionId: "s", contextVersion: 1,
      timestamp: new Date().toISOString(), payload: {} as Record<string, unknown>,
    });

    const e1 = chain.promote(makeBase(1));
    const e2 = chain.promote(makeBase(2));
    const e3 = chain.promote(makeBase(3));

    expect(e2.prevHash).toBe(e1.hash);
    expect(e3.prevHash).toBe(e2.hash);
    expect(chain.verify(e1)).toBe(true);
    expect(chain.verify(e2)).toBe(true);
    expect(chain.verify(e3)).toBe(true);
  });
});
