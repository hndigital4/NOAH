import { describe, expect, it } from "vitest";

import type { Plugin } from "./plugin.js";
import { PluginLoader } from "./plugin-loader.js";
import { PluginRegistry } from "./plugin-registry.js";

function createPlugin(id: string): Plugin {
  return {
    metadata: {
      id,
      name: id,
      version: "0.1.0",
      capabilities: ["command"],
    },
    activate() {},
    deactivate() {},
  };
}

describe("PluginLoader", () => {
  it("loads a plugin into the registry", () => {
    const registry = new PluginRegistry();
    const loader = new PluginLoader(registry);

    loader.load(createPlugin("demo"));

    expect(registry.has("demo")).toBe(true);
  });

  it("unloads a plugin from the registry", () => {
    const registry = new PluginRegistry();
    const loader = new PluginLoader(registry);

    loader.load(createPlugin("demo"));
    loader.unload("demo");

    expect(registry.has("demo")).toBe(false);
  });
});
