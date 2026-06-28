import { describe, expect, it } from "vitest";

import type { Plugin } from "./plugin.js";
import type { PluginManifest } from "./plugin-manifest.js";
import { PluginRegistry } from "./plugin-registry.js";
import { PluginDependencyResolver } from "./plugin-dependency-resolver.js";

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

describe("PluginDependencyResolver", () => {
  it("allows activation when there are no dependencies", () => {
    const registry = new PluginRegistry();
    const resolver = new PluginDependencyResolver(registry);

    const manifest: PluginManifest = {
      id: "plugin-a",
      name: "Plugin A",
      version: "0.1.0",
      entry: "./index.js",
      capabilities: ["command"],
    };

    expect(resolver.canActivate(manifest)).toBe(true);
    expect(resolver.findMissingDependencies(manifest)).toEqual([]);
  });

  it("detects missing dependencies", () => {
    const registry = new PluginRegistry();
    const resolver = new PluginDependencyResolver(registry);

    const manifest: PluginManifest = {
      id: "plugin-a",
      name: "Plugin A",
      version: "0.1.0",
      entry: "./index.js",
      capabilities: ["command"],
      dependencies: ["plugin-b"],
    };

    expect(resolver.canActivate(manifest)).toBe(false);
    expect(resolver.findMissingDependencies(manifest)).toEqual(["plugin-b"]);
  });

  it("allows activation when dependencies are registered", () => {
    const registry = new PluginRegistry();
    const resolver = new PluginDependencyResolver(registry);

    registry.register(createPlugin("plugin-b"));

    const manifest: PluginManifest = {
      id: "plugin-a",
      name: "Plugin A",
      version: "0.1.0",
      entry: "./index.js",
      capabilities: ["command"],
      dependencies: ["plugin-b"],
    };

    expect(resolver.canActivate(manifest)).toBe(true);
    expect(resolver.findMissingDependencies(manifest)).toEqual([]);
  });
});
