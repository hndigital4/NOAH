import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PluginFilesystem } from "./plugin-filesystem.js";

describe("PluginFilesystem", () => {
  it("finds plugin directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "noah-plugins-"));

    try {
      await mkdir(join(root, "hello"));
      await mkdir(join(root, "voice"));
      await writeFile(join(root, "README.md"), "not a plugin");

      const filesystem = new PluginFilesystem(root);
      const directories = await filesystem.findPluginDirectories();

      expect(directories).toHaveLength(2);
      expect(directories.some((dir) => dir.endsWith("hello"))).toBe(true);
      expect(directories.some((dir) => dir.endsWith("voice"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
