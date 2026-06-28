/**
 * @noah/eventbus — Public API
 *
 * The Event Bus has zero internal NOAH dependencies.
 * It may only be imported by packages that declare it as a dependency.
 */

export { EventBus } from "./event-bus.js";
export type { EventBusOptions } from "./event-bus.js";

export { PriorityQueue } from "./priority-queue.js";

export { SubscriptionRouter } from "./router.js";
export type { DeliveryResult } from "./router.js";

export {
  EventType,
  Priority,
  err,
  ok,
} from "./types.js";
export type {
  BusError,
  BusStats,
  EventHandler,
  NoahEvent,
  Result,
  SubscribeOptions,
  Unsubscribe,
} from "./types.js";
