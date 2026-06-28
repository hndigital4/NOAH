import type { Plugin } from "./plugin.js";
import { PluginRegistry } from "./plugin-registry.js";

export class PluginLoader {
  public constructor(
    private readonly registry: PluginRegistry,
  ) {}

  public load(plugin: Plugin): void {
    this.registry.register(plugin);
  }

  public unload(id: string): void {
    this.registry.unregister(id);
  }
}
