import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { PluginManifest } from "./plugin-manifest.js";

export class PluginManifestReader {
  public async read(pluginDirectory: string): Promise<PluginManifest> {
    const manifestPath = join(pluginDirectory, "manifest.json");
    const raw = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(raw) as PluginManifest;

    this.validate(manifest);

    return manifest;
  }

  private validate(manifest: PluginManifest): void {
    if (typeof manifest.id !== "string" || manifest.id.length === 0) {
      throw new Error("Plugin manifest is missing id");
    }

    if (typeof manifest.name !== "string" || manifest.name.length === 0) {
      throw new Error("Plugin manifest is missing name");
    }

    if (typeof manifest.version !== "string" || manifest.version.length === 0) {
      throw new Error("Plugin manifest is missing version");
    }

    if (typeof manifest.entry !== "string" || manifest.entry.length === 0) {
      throw new Error("Plugin manifest is missing entry");
    }

    if (!Array.isArray(manifest.capabilities)) {
      throw new Error("Plugin manifest capabilities must be an array");
    }
  }
}
