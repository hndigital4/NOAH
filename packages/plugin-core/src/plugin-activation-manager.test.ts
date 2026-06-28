import { describe, expect, it, vi } from "vitest";

import type { Plugin } from "./plugin.js";
import type { PluginContext } from "./plugin-context.js";
import { PluginActivationManager } from "./plugin-activation-manager.js";
import { PluginRegistry } from "./plugin-registry.js";
import { PluginState } from "./plugin-state.js";

function createPlugin(id: string): Plugin {
  return {
    metadata: {
      id,
      name: id,
      version: "0.1.0",
      capabilities: ["command"],
    },
    activate: vi.fn(),
    deactivate: vi.fn(),
  };
}

describe("PluginActivationManager", () => {
  it("activates a registered plugin", async () => {
    const registry = new PluginRegistry();
    const plugin = createPlugin("demo");

    registry.register(plugin);

    const context: PluginContext = {
      runtimeVersion: "0.5.7",
      services: {},
    };

    const manager = new PluginActivationManager(registry, context);

    await manager.activate("demo");

    expect(plugin.activate).toHaveBeenCalledWith(context);
    expect(manager.getState("demo")).toBe(PluginState.Active);
  });

  it("deactivates a registered plugin", async () => {
    const registry = new PluginRegistry();
    const plugin = createPlugin("demo");

    registry.register(plugin);

    const context: PluginContext = {
      runtimeVersion: "0.5.7",
      services: {},
    };

    const manager = new PluginActivationManager(registry, context);

    await manager.activate("demo");
    await manager.deactivate("demo");

    expect(plugin.deactivate).toHaveBeenCalledOnce();
    expect(manager.getState("demo")).toBe(PluginState.Inactive);
  });

  it("rejects activation of unknown plugins", async () => {
    const registry = new PluginRegistry();

    const context: PluginContext = {
      runtimeVersion: "0.5.7",
      services: {},
    };

    const manager = new PluginActivationManager(registry, context);

    await expect(manager.activate("missing")).rejects.toThrow(
      "Plugin not registered: missing",
    );
  });
});
