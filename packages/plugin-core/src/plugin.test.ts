import { describe, expect, it } from "vitest";

import type { Plugin } from "./plugin.js";
import type { PluginContext } from "./plugin-context.js";

describe("Plugin contract", () => {
  it("allows a plugin with metadata and lifecycle hooks", async () => {
    const context: PluginContext = {
      runtimeVersion: "0.5.6",
      services: {},
    };

    const plugin: Plugin = {
      metadata: {
        id: "test-plugin",
        name: "Test Plugin",
        version: "0.1.0",
        capabilities: ["command"],
      },

      activate: async (ctx) => {
        expect(ctx.runtimeVersion).toBe("0.5.6");
      },

      deactivate: async () => {},
    };

    expect(plugin.metadata.id).toBe("test-plugin");
    expect(plugin.metadata.capabilities).toContain("command");

    await expect(plugin.activate(context)).resolves.toBeUndefined();
    await expect(plugin.deactivate()).resolves.toBeUndefined();
  });
});
