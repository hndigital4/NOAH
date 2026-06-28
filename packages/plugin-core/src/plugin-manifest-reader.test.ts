import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PluginManifestReader } from "./plugin-manifest-reader.js";

describe("PluginManifestReader", () => {
  it("reads a valid manifest", async () => {
    const root = await mkdtemp(join(tmpdir(), "noah-plugin-"));

    try {
      await writeFile(
        join(root, "manifest.json"),
        JSON.stringify({
          id: "hello",
          name: "Hello Plugin",
          version: "0.1.0",
          entry: "./index.js",
          capabilities: ["command"],
        }),
      );

      const reader = new PluginManifestReader();
      const manifest = await reader.read(root);

      expect(manifest.id).toBe("hello");
      expect(manifest.entry).toBe("./index.js");
      expect(manifest.capabilities).toContain("command");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid manifests", async () => {
    const root = await mkdtemp(join(tmpdir(), "noah-plugin-"));

    try {
      await writeFile(
        join(root, "manifest.json"),
        JSON.stringify({
          name: "Broken Plugin",
          version: "0.1.0",
          entry: "./index.js",
          capabilities: ["command"],
        }),
      );

      const reader = new PluginManifestReader();

      await expect(reader.read(root)).rejects.toThrow(
        "Plugin manifest is missing id",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
