import { pathToFileURL } from "node:url";

import type { Plugin } from "./plugin.js";

export class PluginImporter {
  public async import(entryPath: string): Promise<Plugin> {
    const moduleUrl = pathToFileURL(entryPath).href;
    const module = await import(moduleUrl);

    const plugin = module.default as Plugin | undefined;

    if (plugin === undefined) {
      throw new Error("Plugin module has no default export");
    }

    if (plugin.metadata === undefined) {
      throw new Error("Plugin default export is missing metadata");
    }

    if (typeof plugin.activate !== "function") {
      throw new Error("Plugin default export is missing activate()");
    }

    if (typeof plugin.deactivate !== "function") {
      throw new Error("Plugin default export is missing deactivate()");
    }

    return plugin;
  }
}
