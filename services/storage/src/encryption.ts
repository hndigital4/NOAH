/**
 * NOAH Storage — AES-256-GCM Encryption
 *
 * Each storage partition has an independent encryption key derived from
 * the Master Key. In Sprint 01, the Master Key is provided externally
 * (for testing, a random key is generated). In Sprint 10, it is derived
 * by the Security Engine via HKDF-SHA512 from the identity verification result.
 *
 * @see Runtime Specification §107 — Encryption Architecture
 * @see Runtime Specification §107 — Storage Key (SK): "One partition's compromise
 *      does not affect others."
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

import { err, ok } from "@noah/eventbus";
import type { Result } from "@noah/eventbus";

import type { EncryptedEnvelope, StoragePartition } from "./types.js";

const ALGORITHM  = "aes-256-gcm";
const IV_BYTES   = 12;
const KEY_BYTES  = 32; // 256-bit
const KEY_VERSION = 1;

// ---------------------------------------------------------------------------
// Key derivation — partition-scoped
// ---------------------------------------------------------------------------

/**
 * Derive a partition-specific 256-bit key from the master key.
 * Uses HMAC-SHA256 with the partition name as the context/salt.
 * Production uses HKDF-SHA512 via the Security Engine.
 */
function derivePartitionKey(masterKey: Buffer, partition: StoragePartition): Buffer {
  const hmac = createHmac("sha256", masterKey);
  hmac.update(`NOAH-STORAGE-${partition.toUpperCase()}-v${KEY_VERSION}`);
  return hmac.digest();
}

// ---------------------------------------------------------------------------
// EncryptionService
// ---------------------------------------------------------------------------

export class EncryptionService {
  private readonly partitionKeys: Map<StoragePartition, Buffer> = new Map();

  constructor(masterKey: Buffer) {
    if (masterKey.length !== KEY_BYTES) {
      throw new Error(
        `EncryptionService: masterKey must be ${KEY_BYTES} bytes, got ${masterKey.length}`,
      );
    }
    // Pre-derive all partition keys at construction time
    const partitions: StoragePartition[] = ["persistent", "session", "archive", "audit"];
    for (const partition of partitions) {
      this.partitionKeys.set(partition, derivePartitionKey(masterKey, partition));
    }
  }

  // ---------------------------------------------------------------------------
  // Encrypt
  // ---------------------------------------------------------------------------

  encrypt(
    partition: StoragePartition,
    plaintext: string,
  ): Result<EncryptedEnvelope, { code: string; message: string }> {
    const key = this.partitionKeys.get(partition);
    if (key === undefined) {
      return err({ code: "STORAGE.ENCRYPT_NO_KEY", message: `No key for partition: ${partition}` });
    }

    try {
      const iv     = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, iv);

      const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      return ok({
        iv:         iv.toString("base64"),
        authTag:    authTag.toString("base64"),
        ciphertext: encrypted.toString("base64"),
        partition,
        keyVersion: KEY_VERSION,
      });
    } catch (cause: unknown) {
      return err({
        code:    "STORAGE.ENCRYPT_FAILED",
        message: cause instanceof Error ? cause.message : "Encryption failed",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Decrypt
  // ---------------------------------------------------------------------------

  decrypt(
    partition: StoragePartition,
    envelope: EncryptedEnvelope,
  ): Result<string, { code: string; message: string }> {
    // Partition binding check — prevent cross-partition decryption
    if (envelope.partition !== partition) {
      return err({
        code:    "STORAGE.PARTITION_MISMATCH",
        message: `Envelope partition '${envelope.partition}' does not match requested '${partition}'`,
      });
    }

    const key = this.partitionKeys.get(partition);
    if (key === undefined) {
      return err({ code: "STORAGE.DECRYPT_NO_KEY", message: `No key for partition: ${partition}` });
    }

    try {
      const iv         = Buffer.from(envelope.iv,         "base64");
      const authTag    = Buffer.from(envelope.authTag,    "base64");
      const ciphertext = Buffer.from(envelope.ciphertext, "base64");

      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");

      return ok(plaintext);
    } catch (cause: unknown) {
      return err({
        code:    "STORAGE.DECRYPT_FAILED",
        message: cause instanceof Error ? cause.message : "Decryption failed (possible tampering)",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Factory
  // ---------------------------------------------------------------------------

  /** Generate a random 256-bit master key. For testing and initial setup only. */
  static generateMasterKey(): Buffer {
    return randomBytes(KEY_BYTES);
  }
}
