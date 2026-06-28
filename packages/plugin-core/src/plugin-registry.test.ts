import { describe, expect, it } from "vitest";

import type { Plugin } from "./plugin.js";
import { PluginRegistry } from "./plugin-registry.js";

function createPlugin(id: string): Plugin {
  return {
    metadata: {
      id,
      name: id,
      version: "0.1.0",
      capabilities: ["command"],
    },
    activate: () => {},
    deactivate: () => {},
  };
}

describe("PluginRegistry", () => {
  it("registers and retrieves a plugin", () => {
    const registry = new PluginRegistry();
    const plugin = createPlugin("test-plugin");

    registry.register(plugin);

    expect(registry.has("test-plugin")).toBe(true);
    expect(registry.get("test-plugin")).toBe(plugin);
  });

  it("lists registered plugins", () => {
    const registry = new PluginRegistry();

    registry.register(createPlugin("plugin-a"));
    registry.register(createPlugin("plugin-b"));

    expect(registry.list()).toHaveLength(2);
  });

  it("unregisters a plugin", () => {
    const registry = new PluginRegistry();

    registry.register(createPlugin("test-plugin"));
    registry.unregister("test-plugin");

    expect(registry.has("test-plugin")).toBe(false);
    expect(registry.get("test-plugin")).toBeUndefined();
  });

  it("rejects duplicate plugin ids", () => {
    const registry = new PluginRegistry();

    registry.register(createPlugin("test-plugin"));

    expect(() => registry.register(createPlugin("test-plugin"))).toThrow(
      "Plugin already registered: test-plugin",
    );
  });
});
