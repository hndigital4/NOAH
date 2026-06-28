import type { PluginCapability } from "./plugin.js";

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  /**
   * Plugin entrypoint, relative to the plugin root.
   */
  readonly entry: string;

  readonly description?: string;

  readonly capabilities: readonly PluginCapability[];

  /**
   * IDs of plugins that must be available before this plugin can be activated.
   */
  readonly dependencies?: readonly string[];
}
