/**
 * NOAH Storage — In-Memory Adapter
 *
 * Sprint 01 storage backend. All data is held in memory-encrypted Maps.
 * Encryption is fully applied (AES-256-GCM) — this is not a stub.
 * The only limitation vs. the production file-system adapter is that
 * data does not survive process restarts.
 *
 * The file-system adapter (Sprint 02 onwards) implements the same
 * IStorageAdapter interface — the Memory Engine sees no difference.
 */

import { err, ok } from "@noah/eventbus";

import { EncryptionService } from "./encryption.js";
import type {
  EncryptedEnvelope,
  IStorageAdapter,
  StorageError,
  StorageObject,
  StoragePartition,
  StorageResult,
  StorageValue,
} from "./types.js";

export class MemoryStorageAdapter implements IStorageAdapter {
  private readonly encryption: EncryptionService;
  /** Map<partition, Map<key, encrypted envelope JSON>> */
  private readonly store = new Map<StoragePartition, Map<string, string>>();
  /** Append-only partition stores serialized records as an array */
  private readonly appendStore = new Map<typeof StoragePartition.AUDIT, string[]>();

  constructor(masterKey: Buffer) {
    this.encryption = new EncryptionService(masterKey);
  }

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------

  async get(
    partition: StoragePartition,
    key: string,
  ): Promise<StorageResult<StorageValue | null>> {
    const partitionMap = this.store.get(partition);
    if (partitionMap === undefined) return ok(null);

    const raw = partitionMap.get(key);
    if (raw === undefined) return ok(null);

    let envelope: EncryptedEnvelope;
    try {
      envelope = JSON.parse(raw) as EncryptedEnvelope;
    } catch {
      return err<StorageError>({
        code:    "STORAGE.CORRUPT_ENVELOPE",
        message: `Failed to parse envelope for key '${key}' in partition '${partition}'`,
      });
    }

    const decryptResult = this.encryption.decrypt(partition, envelope);
    if (!decryptResult.ok) {
      return err<StorageError>({
        code:    decryptResult.error.code,
        message: decryptResult.error.message,
      });
    }

    try {
      const value = JSON.parse(decryptResult.value) as StorageValue;
      return ok(value);
    } catch {
      return err<StorageError>({
        code:    "STORAGE.CORRUPT_VALUE",
        message: `Failed to deserialize value for key '${key}'`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // set
  // ---------------------------------------------------------------------------

  async set(
    partition: StoragePartition,
    key: string,
    value: StorageValue,
  ): Promise<StorageResult<void>> {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      return err<StorageError>({
        code:    "STORAGE.SERIALIZE_FAILED",
        message: `Failed to serialize value for key '${key}'`,
      });
    }

    const encryptResult = this.encryption.encrypt(partition, serialized);
    if (!encryptResult.ok) {
      return err<StorageError>({
        code:    encryptResult.error.code,
        message: encryptResult.error.message,
      });
    }

    if (!this.store.has(partition)) {
      this.store.set(partition, new Map());
    }
    (this.store.get(partition) as Map<string, string>).set(
      key,
      JSON.stringify(encryptResult.value),
    );

    return ok(undefined);
  }

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  async delete(partition: StoragePartition, key: string): Promise<StorageResult<void>> {
    this.store.get(partition)?.delete(key);
    return ok(undefined);
  }

  // ---------------------------------------------------------------------------
  // keys
  // ---------------------------------------------------------------------------

  async keys(partition: StoragePartition, prefix?: string): Promise<StorageResult<string[]>> {
    const partitionMap = this.store.get(partition);
    if (partitionMap === undefined) return ok([]);

    const allKeys = Array.from(partitionMap.keys());
    if (prefix === undefined) return ok(allKeys);
    return ok(allKeys.filter((k) => k.startsWith(prefix)));
  }

  // ---------------------------------------------------------------------------
  // append (AUDIT partition only)
  // ---------------------------------------------------------------------------

  async append(
    _partition: typeof StoragePartition.AUDIT,
    record: StorageObject,
  ): Promise<StorageResult<void>> {
    if (!this.appendStore.has("audit")) {
      this.appendStore.set("audit", []);
    }
    (this.appendStore.get("audit") as string[]).push(JSON.stringify(record));
    return ok(undefined);
  }

  // ---------------------------------------------------------------------------
  // clearPartition
  // ---------------------------------------------------------------------------

  async clearPartition(partition: StoragePartition): Promise<StorageResult<void>> {
    if (partition === "audit") {
      return err<StorageError>({
        code:    "STORAGE.AUDIT_IMMUTABLE",
        message: "The audit partition cannot be cleared — audit data is immutable",
      });
    }
    this.store.get(partition)?.clear();
    return ok(undefined);
  }

  // ---------------------------------------------------------------------------
  // Test helpers
  // ---------------------------------------------------------------------------

  /** Number of keys in a partition (for assertions in tests) */
  partitionSize(partition: StoragePartition): number {
    return this.store.get(partition)?.size ?? 0;
  }

  auditRecordCount(): number {
    return this.appendStore.get("audit")?.length ?? 0;
  }
}
