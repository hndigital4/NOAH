import type { PluginContext } from "./plugin-context.js";

export type PluginCapability =
  | "command"
  | "workflow"
  | "device"
  | "communication"
  | "storage"
  | "voice"
  | "ai";

export interface PluginMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly capabilities: readonly PluginCapability[];
}

export interface Plugin {
  readonly metadata: PluginMetadata;

  activate(context: PluginContext): Promise<void> | void;

  deactivate(): Promise<void> | void;
}
