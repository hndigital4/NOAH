import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { Device, DeviceMetadata } from "./device.js";
import type { DeviceContext } from "./device-context.js";

export class FilesystemDevice implements Device {
  public readonly metadata: DeviceMetadata = {
    id: "filesystem",
    name: "Filesystem Device",
    type: "file-system",
    version: "0.1.0",
  };

  private connected = false;

  public connect(_context: DeviceContext): void {
    this.connected = true;
  }

  public disconnect(): void {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async readText(path: string): Promise<string> {
    this.assertConnected();

    return readFile(path, "utf8");
  }

  public async writeText(path: string, content: string): Promise<void> {
    this.assertConnected();

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  }

  public async delete(path: string): Promise<void> {
    this.assertConnected();

    await rm(path, { recursive: true, force: true });
  }

  public resolve(root: string, path: string): string {
    return join(root, path);
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new Error("Filesystem device is not connected");
    }
  }
}
