import { join } from "node:path";

import { PluginFilesystem } from "./plugin-filesystem.js";
import { PluginImporter } from "./plugin-importer.js";
import { PluginManifestReader } from "./plugin-manifest-reader.js";
import { PluginRegistry } from "./plugin-registry.js";

export class FilesystemPluginLoader {
  public constructor(
    private readonly filesystem: PluginFilesystem,
    private readonly manifestReader: PluginManifestReader,
    private readonly importer: PluginImporter,
    private readonly registry: PluginRegistry,
  ) {}

  public async loadAll(): Promise<void> {
    const pluginDirectories = await this.filesystem.findPluginDirectories();

    for (const pluginDirectory of pluginDirectories) {
      const manifest = await this.manifestReader.read(pluginDirectory);
      const entryPath = join(pluginDirectory, manifest.entry);

      const plugin = await this.importer.import(entryPath);

      this.registry.register(plugin);
    }
  }
}
