import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PluginImporter } from "./plugin-importer.js";

describe("PluginImporter", () => {
  it("imports a plugin default export", async () => {
    const root = await mkdtemp(join(tmpdir(), "noah-plugin-"));

    try {
      const entry = join(root, "index.js");

      await writeFile(
        entry,
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

      const importer = new PluginImporter();
      const plugin = await importer.import(entry);

      expect(plugin.metadata.id).toBe("hello");
      expect(typeof plugin.activate).toBe("function");
      expect(typeof plugin.deactivate).toBe("function");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects modules without default plugin export", async () => {
    const root = await mkdtemp(join(tmpdir(), "noah-plugin-"));

    try {
      const entry = join(root, "index.js");

      await writeFile(entry, "export const value = 1;");

      const importer = new PluginImporter();

      await expect(importer.import(entry)).rejects.toThrow(
        "Plugin module has no default export",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
