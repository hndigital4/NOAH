import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FilesystemPluginLoader } from "./filesystem-plugin-loader.js";
import { PluginFilesystem } from "./plugin-filesystem.js";
import { PluginImporter } from "./plugin-importer.js";
import { PluginManifestReader } from "./plugin-manifest-reader.js";
import { PluginRegistry } from "./plugin-registry.js";

describe("FilesystemPluginLoader", () => {
  it("loads plugins from plugin directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "noah-plugins-"));

    try {
      const pluginDirectory = join(root, "hello");

      await mkdir(pluginDirectory);

      await writeFile(
        join(pluginDirectory, "manifest.json"),
        JSON.stringify({
          id: "hello",
          name: "Hello Plugin",
          version: "0.1.0",
          entry: "./index.js",
          capabilities: ["command"],
        }),
      );

      await writeFile(
        join(pluginDirectory, "index.js"),
        `
          export default {
            metadata: {
              id: "hello",
              name: "Hello Plugin",
              version: "0.1.0",
              capabilities: ["command"]
            },
            activate() {},
            deactivate() {}
          };
        `,
      );

      const registry = new PluginRegistry();

      const loader = new FilesystemPluginLoader(
        new PluginFilesystem(root),
        new PluginManifestReader(),
        new PluginImporter(),
        registry,
      );

      await loader.loadAll();

      expect(registry.has("hello")).toBe(true);
      expect(registry.get("hello")?.metadata.name).toBe("Hello Plugin");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
