/**
 * NOAH Storage — Types
 *
 * Storage uses AES-256-GCM for authenticated encryption at rest.
 * The Storage Adapter interface is implemented by the platform-specific
 * storage backend. Sprint 01 provides a file-system backend.
 * Production (Sprint 10) replaces the key derivation with the Security Engine.
 *
 * @see Runtime Specification §107 — Encryption Architecture
 */

import type { Result } from "@noah/eventbus";

export type StorageResult<T> = Result<T, StorageError>;

export interface StorageError {
  readonly code:    string;
  readonly message: string;
  /** Original error if wrapping a thrown exception */
  readonly cause?:  unknown;
}

// ---------------------------------------------------------------------------
// Storage partition identifiers
// ---------------------------------------------------------------------------

/**
 * Each partition has its own encryption key (derived from the Master Key).
 * @see Runtime Specification §107 — Storage Key (SK)
 */
export const StoragePartition = {
  /** Primary user data — entities, relationships */
  PERSISTENT: "persistent",
  /** Current and recent session data */
  SESSION:    "session",
  /** Compressed older data */
  ARCHIVE:    "archive",
  /** Immutable audit trail (append-only) */
  AUDIT:      "audit",
} as const;

export type StoragePartition = (typeof StoragePartition)[keyof typeof StoragePartition];

// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------

/** Supported value types for the KV store */
export type StorageValue = string | number | boolean | StorageObject | StorageArray;
export type StorageObject = { readonly [key: string]: StorageValue };
export type StorageArray  = ReadonlyArray<StorageValue>;

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

/**
 * IStorageAdapter — the interface all storage backends must implement.
 * All methods return Result — never throw across the package boundary.
 */
export interface IStorageAdapter {
  /**
   * Retrieve a value by key from a partition.
   * Returns ok(null) if the key does not exist.
   */
  get(
    partition: StoragePartition,
    key: string,
  ): Promise<StorageResult<StorageValue | null>>;

  /**
   * Write a value.
   * The value is serialized and encrypted before being written to disk.
   */
  set(
    partition: StoragePartition,
    key: string,
    value: StorageValue,
  ): Promise<StorageResult<void>>;

  /**
   * Delete a key. Returns ok(void) whether or not the key existed.
   */
  delete(
    partition: StoragePartition,
    key: string,
  ): Promise<StorageResult<void>>;

  /**
   * List all keys in a partition, optionally filtered by prefix.
   */
  keys(
    partition: StoragePartition,
    prefix?: string,
  ): Promise<StorageResult<string[]>>;

  /**
   * Append a record to an append-only partition (AUDIT only).
   * Returns StorageError if called on a non-append-only partition.
   */
  append(
    partition: typeof StoragePartition.AUDIT,
    record: StorageObject,
  ): Promise<StorageResult<void>>;

  /**
   * Delete all keys in a partition.
   * AUDIT partition rejects this call — audit data cannot be cleared.
   */
  clearPartition(partition: StoragePartition): Promise<StorageResult<void>>;
}

// ---------------------------------------------------------------------------
// Encryption metadata stored alongside each encrypted value
// ---------------------------------------------------------------------------

export interface EncryptedEnvelope {
  /** AES-256-GCM IV (12 bytes, base64) */
  readonly iv:         string;
  /** Auth tag (16 bytes, base64) */
  readonly authTag:    string;
  /** Encrypted payload (base64) */
  readonly ciphertext: string;
  /** Storage partition this was encrypted for (validated on read) */
  readonly partition:  StoragePartition;
  /** Key version — allows key rotation without re-encrypting all data */
  readonly keyVersion: number;
}
