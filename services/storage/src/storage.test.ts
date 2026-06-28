import { describe, expect, it } from "vitest";

import { EncryptionService } from "./encryption.js";
import { MemoryStorageAdapter } from "./memory-adapter.js";
import { StoragePartition } from "./types.js";

// ---------------------------------------------------------------------------
// EncryptionService tests
// ---------------------------------------------------------------------------

describe("EncryptionService", () => {
  const key = EncryptionService.generateMasterKey();
  const svc = new EncryptionService(key);

  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "NOAH platform secret data";
    const encResult = svc.encrypt("persistent", plaintext);
    expect(encResult.ok).toBe(true);
    if (!encResult.ok) throw new Error("encrypt failed");

    const decResult = svc.decrypt("persistent", encResult.value);
    expect(decResult.ok).toBe(true);
    if (!decResult.ok) throw new Error("decrypt failed");
    expect(decResult.value).toBe(plaintext);
  });

  it("rejects decryption with wrong partition (partition binding)", () => {
    const encResult = svc.encrypt("persistent", "data");
    if (!encResult.ok) throw new Error();

    // Try to decrypt using a different partition
    const decResult = svc.decrypt("session", encResult.value);
    expect(decResult.ok).toBe(false);
    if (decResult.ok) throw new Error();
    expect(decResult.error.code).toBe("STORAGE.PARTITION_MISMATCH");
  });

  it("rejects tampered ciphertext", () => {
    const encResult = svc.encrypt("persistent", "sensitive");
    if (!encResult.ok) throw new Error();

    // Tamper with the ciphertext
    const tampered = {
      ...encResult.value,
      ciphertext: Buffer.from("00000000000000000000").toString("base64"),
    };
    const decResult = svc.decrypt("persistent", tampered);
    expect(decResult.ok).toBe(false);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const r1 = svc.encrypt("persistent", "same plaintext");
    const r2 = svc.encrypt("persistent", "same plaintext");
    if (!r1.ok || !r2.ok) throw new Error();
    expect(r1.value.ciphertext).not.toBe(r2.value.ciphertext);
    expect(r1.value.iv).not.toBe(r2.value.iv);
  });

  it("throws if masterKey is wrong length", () => {
    expect(() => new EncryptionService(Buffer.alloc(16))).toThrow();
  });

  it("partition keys are independent (different keys per partition)", () => {
    const key1 = EncryptionService.generateMasterKey();
    const svc1 = new EncryptionService(key1);
    const svc2 = new EncryptionService(key1);

    // Encrypt in persistent with svc1, try to cross-decrypt in session with svc2
    const enc = svc1.encrypt("persistent", "cross-test");
    if (!enc.ok) throw new Error();

    // Force-override partition to 'session' to simulate cross-partition attempt
    const crossPartition = { ...enc.value, partition: "session" as StoragePartition };
    const dec = svc2.decrypt("session", crossPartition);
    expect(dec.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MemoryStorageAdapter tests
// ---------------------------------------------------------------------------

describe("MemoryStorageAdapter", () => {
  function makeAdapter() {
    return new MemoryStorageAdapter(EncryptionService.generateMasterKey());
  }

  it("set and get round-trips a string value", async () => {
    const adapter = makeAdapter();
    await adapter.set("persistent", "user:profile", "Alice");
    const result = await adapter.get("persistent", "user:profile");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.value).toBe("Alice");
  });

  it("set and get round-trips a complex object", async () => {
    const adapter = makeAdapter();
    const entity = { id: "e1", name: "NOAH Project", type: "Project", strength: 0.9 };
    await adapter.set("persistent", "entity:e1", entity);
    const result = await adapter.get("persistent", "entity:e1");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.value).toEqual(entity);
  });

  it("returns ok(null) for missing key", async () => {
    const adapter = makeAdapter();
    const result = await adapter.get("persistent", "nonexistent");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.value).toBeNull();
  });

  it("delete removes a key", async () => {
    const adapter = makeAdapter();
    await adapter.set("session", "key1", "value");
    await adapter.delete("session", "key1");
    const result = await adapter.get("session", "key1");
    if (!result.ok) throw new Error();
    expect(result.value).toBeNull();
  });

  it("delete on nonexistent key returns ok", async () => {
    const adapter = makeAdapter();
    const result = await adapter.delete("persistent", "ghost-key");
    expect(result.ok).toBe(true);
  });

  it("keys lists all keys in partition", async () => {
    const adapter = makeAdapter();
    await adapter.set("persistent", "a:1", 1);
    await adapter.set("persistent", "a:2", 2);
    await adapter.set("persistent", "b:1", 3);
    const result = await adapter.keys("persistent");
    if (!result.ok) throw new Error();
    expect(result.value.sort()).toEqual(["a:1", "a:2", "b:1"]);
  });

  it("keys with prefix filters correctly", async () => {
    const adapter = makeAdapter();
    await adapter.set("persistent", "entity:1", 1);
    await adapter.set("persistent", "entity:2", 2);
    await adapter.set("persistent", "session:1", 3);
    const result = await adapter.keys("persistent", "entity:");
    if (!result.ok) throw new Error();
    expect(result.value.sort()).toEqual(["entity:1", "entity:2"]);
  });

  it("partitions are isolated from each other", async () => {
    const adapter = makeAdapter();
    await adapter.set("persistent", "key", "persistent-value");
    await adapter.set("session",    "key", "session-value");
    const p = await adapter.get("persistent", "key");
    const s = await adapter.get("session",    "key");
    if (!p.ok || !s.ok) throw new Error();
    expect(p.value).toBe("persistent-value");
    expect(s.value).toBe("session-value");
  });

  it("clearPartition removes all keys", async () => {
    const adapter = makeAdapter();
    await adapter.set("session", "k1", 1);
    await adapter.set("session", "k2", 2);
    await adapter.clearPartition("session");
    expect(adapter.partitionSize("session")).toBe(0);
  });

  it("clearPartition rejects audit partition", async () => {
    const adapter = makeAdapter();
    const result = await adapter.clearPartition("audit");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error();
    expect(result.error.code).toBe("STORAGE.AUDIT_IMMUTABLE");
  });

  it("append adds records to audit partition", async () => {
    const adapter = makeAdapter();
    await adapter.append("audit", { event: "AUTH_SUCCESS", ts: Date.now() });
    await adapter.append("audit", { event: "GATE_APPROVED", ts: Date.now() });
    expect(adapter.auditRecordCount()).toBe(2);
  });
});
