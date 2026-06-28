import type { PluginContext } from "./plugin-context.js";
import { PluginRegistry } from "./plugin-registry.js";
import { PluginState } from "./plugin-state.js";

export class PluginActivationManager {
  private readonly states = new Map<string, PluginState>();

  public constructor(
    private readonly registry: PluginRegistry,
    private readonly context: PluginContext,
  ) {}

  public getState(id: string): PluginState | undefined {
    return this.states.get(id);
  }

  public async activate(id: string): Promise<void> {
    const plugin = this.registry.get(id);

    if (plugin === undefined) {
      throw new Error(`Plugin not registered: ${id}`);
    }

    await plugin.activate(this.context);

    this.states.set(id, PluginState.Active);
  }

  public async deactivate(id: string): Promise<void> {
    const plugin = this.registry.get(id);

    if (plugin === undefined) {
      throw new Error(`Plugin not registered: ${id}`);
    }

    await plugin.deactivate();

    this.states.set(id, PluginState.Inactive);
  }
}
