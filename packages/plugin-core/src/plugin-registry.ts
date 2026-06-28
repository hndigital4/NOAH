import type { Plugin } from "./plugin.js";

export class PluginRegistry {
  private readonly plugins = new Map<string, Plugin>();

  public register(plugin: Plugin): void {
    const id = plugin.metadata.id;

    if (this.plugins.has(id)) {
      throw new Error(`Plugin already registered: ${id}`);
    }

    this.plugins.set(id, plugin);
  }

  public unregister(id: string): void {
    this.plugins.delete(id);
  }

  public get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  public has(id: string): boolean {
    return this.plugins.has(id);
  }

  public list(): readonly Plugin[] {
    return [...this.plugins.values()];
  }
}
