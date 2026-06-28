import type { DeviceContext } from "./device-context.js";
import { DeviceRegistry } from "./device-registry.js";

export class DeviceManager {
  public constructor(
    private readonly registry: DeviceRegistry,
    private readonly context: DeviceContext,
  ) {}

  public async connect(id: string): Promise<void> {
    const device = this.registry.get(id);

    if (device === undefined) {
      throw new Error(`Device not registered: ${id}`);
    }

    await device.connect(this.context);
  }

  public async disconnect(id: string): Promise<void> {
    const device = this.registry.get(id);

    if (device === undefined) {
      throw new Error(`Device not registered: ${id}`);
    }

    await device.disconnect();
  }

  public isConnected(id: string): boolean {
    const device = this.registry.get(id);

    if (device === undefined) {
      return false;
    }

    return device.isConnected();
  }
}
