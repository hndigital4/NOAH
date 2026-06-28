import { describe, expect, it } from "vitest";

import type { PluginManifest } from "./plugin-manifest.js";

describe("PluginManifest", () => {
  it("describes a plugin entrypoint and capabilities", () => {
    const manifest: PluginManifest = {
      id: "voice",
      name: "Voice Plugin",
      version: "0.1.0",
      entry: "./index.js",
      capabilities: ["voice"],
      dependencies: [],
    };

    expect(manifest.id).toBe("voice");
    expect(manifest.entry).toBe("./index.js");
    expect(manifest.capabilities).toContain("voice");
  });
});
