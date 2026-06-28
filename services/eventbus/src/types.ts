/**
 * NOAH Event Bus — Core Types
 * @see Runtime Specification §117–§126
 * @see Engineering Blueprint Part 04 — Public Interfaces
 *
 * The Event Bus uses P0–P5 priority levels. P0 events are never delayed
 * beyond 5ms regardless of queue depth. All events are typed and immutable.
 */

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

/**
 * Event priority levels.
 * P0 = Critical (security, power events)     — max latency 5ms
 * P1 = System   (engine failure, token expiry)— max latency 100ms
 * P2 = User     (voice command, interaction)  — max latency 100ms
 * P3 = Context  (module relevance, workflow)  — max latency 200ms
 * P4 = Background (memory flush, preload)     — max latency 1000ms
 * P5 = Deferred (analytics, prefetch)         — no latency guarantee
 *
 * @see Engineering Blueprint §16 — Core Prioritisation
 */
export const Priority = {
  P0_CRITICAL:   0,
  P1_SYSTEM:     1,
  P2_USER:       2,
  P3_CONTEXT:    3,
  P4_BACKGROUND: 4,
  P5_DEFERRED:   5,
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

// ---------------------------------------------------------------------------
// Event namespaces
// ---------------------------------------------------------------------------

/**
 * All valid event type strings. Format: NAMESPACE.VERB
 * @see Engineering Blueprint §124 — Event Taxonomy
 */
export const EventType = {
  // SYSTEM — emitted only by Core or Kernel
  SYSTEM_READY:      "SYSTEM.READY",
  SYSTEM_TICK:       "SYSTEM.TICK",
  SYSTEM_SHUTDOWN:   "SYSTEM.SHUTDOWN",
  SYSTEM_RESUMED:    "SYSTEM.RESUMED",

  // SECURITY
  SECURITY_GATE_APPROVED: "SECURITY.GATE_APPROVED",
  SECURITY_GATE_DENIED:   "SECURITY.GATE_DENIED",
  SECURITY_VIOLATION:     "SECURITY.VIOLATION",
  SECURITY_EMERGENCY_LOCK:"SECURITY.EMERGENCY_LOCK",
  SECURITY_AUTH_SUCCESS:  "SECURITY.AUTH_SUCCESS",
  SECURITY_AUTH_FAILED:   "SECURITY.AUTH_FAILED",

  // CONTEXT
  CONTEXT_UPDATED:  "CONTEXT.UPDATED",
  CONTEXT_SHIFTED:  "CONTEXT.SHIFTED",
  CONTEXT_RESTORED: "CONTEXT.RESTORED",

  // VOICE
  VOICE_WAKE:       "VOICE.WAKE",
  VOICE_LISTENING:  "VOICE.LISTENING",
  VOICE_INTENT:     "VOICE.INTENT",
  VOICE_SPEAKING:   "VOICE.SPEAKING",
  VOICE_SILENT:     "VOICE.SILENT",

  // MODULE
  MODULE_LOADED:   "MODULE.LOADED",
  MODULE_SURFACED: "MODULE.SURFACED",
  MODULE_FOCUSED:  "MODULE.FOCUSED",
  MODULE_SLEEPING: "MODULE.SLEEPING",
  MODULE_CRASHED:  "MODULE.CRASHED",
  MODULE_ARCHIVED: "MODULE.ARCHIVED",

  // MEMORY
  MEMORY_QUERY:      "MEMORY.QUERY",
  MEMORY_RECALL:     "MEMORY.RECALL",
  MEMORY_WRITE:      "MEMORY.WRITE",
  MEMORY_COMPRESSED: "MEMORY.COMPRESSED",
  MEMORY_ARCHIVED:   "MEMORY.ARCHIVED",

  // PRESENCE
  PRESENCE_DEVICE_JOINED:      "PRESENCE.DEVICE_JOINED",
  PRESENCE_TRANSFER_START:     "PRESENCE.TRANSFER_START",
  PRESENCE_TRANSFER_COMPLETE:  "PRESENCE.TRANSFER_COMPLETE",
  PRESENCE_DEVICE_LOST:        "PRESENCE.DEVICE_LOST",

  // WORKFLOW
  WORKFLOW_STARTED:        "WORKFLOW.STARTED",
  WORKFLOW_STEP_COMPLETE:  "WORKFLOW.STEP_COMPLETE",
  WORKFLOW_PAUSED:         "WORKFLOW.PAUSED",
  WORKFLOW_COMPLETED:      "WORKFLOW.COMPLETED",
  WORKFLOW_FAILED:         "WORKFLOW.FAILED",

  // INTEGRATION
  INTEGRATION_REQUEST:  "INTEGRATION.REQUEST",
  INTEGRATION_RESPONSE: "INTEGRATION.RESPONSE",
  INTEGRATION_FAILED:   "INTEGRATION.FAILED",
  INTEGRATION_OFFLINE:  "INTEGRATION.OFFLINE",

  // ENGINE HEALTH
  ENGINE_HEALTH_DEGRADED: "ENGINE.HEALTH_DEGRADED",
  ENGINE_HEALTH_RESTORED: "ENGINE.HEALTH_RESTORED",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

// ---------------------------------------------------------------------------
// Event envelope
// ---------------------------------------------------------------------------

/**
 * The immutable event envelope. Every event on the Bus has this shape.
 * @see Runtime Specification §117 — Event Schema
 */
export interface NoahEvent<TPayload = unknown> {
  /** Globally unique event identifier (UUID v4) */
  readonly id: string;
  /** Typed event category */
  readonly type: EventType;
  /** Priority level — determines queue placement */
  readonly priority: Priority;
  /** Engine or module that emitted this event */
  readonly emitterId: string;
  /** Nanosecond-precision timestamp (Date.now() in ms — extended in production) */
  readonly timestamp: number;
  /** Context object version when this event was emitted (0 = pre-boot) */
  readonly contextVersion: number;
  /** Typed event payload — schema defined per EventType */
  readonly payload: TPayload;
  /**
   * Optional correlation ID linking this event to a preceding event/request.
   * Used for request/response pairs and workflow step sequences.
   */
  readonly correlationId?: string;
  /**
   * TTL in milliseconds. If set, the Bus discards the event if it has
   * not been delivered within this window. P4/P5 events may have TTLs.
   */
  readonly ttlMs?: number;
  /** If true, the Bus copies this event to the Audit Trail writer. */
  readonly auditRequired: boolean;
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

/** A function that handles a delivered event. Must not throw — wrap in try/catch internally. */
export type EventHandler<TPayload = unknown> = (event: NoahEvent<TPayload>) => void;

/** Returned by subscribe(). Call to remove the subscription. */
export type Unsubscribe = () => void;

/** Options passed to subscribe(). */
export interface SubscribeOptions {
  /**
   * Subscriber identity — used in delivery failure logs.
   * Required for SYSTEM.* subscriptions (Core only).
   */
  subscriberId: string;
}

// ---------------------------------------------------------------------------
// Result type — no throws across package boundaries
// ---------------------------------------------------------------------------

export type Result<T, E = BusError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export interface BusError {
  readonly code: string;
  readonly message: string;
  readonly eventId?: string;
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends BusError>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Bus statistics (exposed for health monitoring)
// ---------------------------------------------------------------------------

export interface BusStats {
  readonly totalEmitted: number;
  readonly totalDelivered: number;
  readonly totalDropped: number;
  readonly totalExpired: number;
  /** Per-priority queue depths at the moment of reading */
  readonly queueDepths: Readonly<Record<Priority, number>>;
  /** Subscriptions per event type */
  readonly subscriptionCount: number;
}
