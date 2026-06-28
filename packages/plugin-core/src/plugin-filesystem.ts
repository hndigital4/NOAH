import { readdir } from "node:fs/promises";
import { join } from "node:path";

export class PluginFilesystem {
  public constructor(
    private readonly pluginsRoot: string,
  ) {}

  public async findPluginDirectories(): Promise<readonly string[]> {
    const entries = await readdir(this.pluginsRoot, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(this.pluginsRoot, entry.name));
  }
}
