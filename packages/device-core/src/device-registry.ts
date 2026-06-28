import type { Device } from "./device.js";

export class DeviceRegistry {
  private readonly devices = new Map<string, Device>();

  public register(device: Device): void {
    const id = device.metadata.id;

    if (this.devices.has(id)) {
      throw new Error(`Device already registered: ${id}`);
    }

    this.devices.set(id, device);
  }

  public unregister(id: string): void {
    this.devices.delete(id);
  }

  public get(id: string): Device | undefined {
    return this.devices.get(id);
  }

  public has(id: string): boolean {
    return this.devices.has(id);
  }

  public list(): readonly Device[] {
    return [...this.devices.values()];
  }
}
