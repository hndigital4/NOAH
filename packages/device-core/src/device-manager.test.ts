import { describe, expect, it } from "vitest";

import type { Device } from "./device.js";
import { DeviceManager } from "./device-manager.js";
import { DeviceRegistry } from "./device-registry.js";

function createDevice(id: string): Device {
  let connected = false;

  return {
    metadata: {
      id,
      name: id,
      type: "unknown",
    },

    connect() {
      connected = true;
    },

    disconnect() {
      connected = false;
    },

    isConnected() {
      return connected;
    },
  };
}

describe("DeviceManager", () => {
  it("connects a registered device", async () => {
    const registry = new DeviceRegistry();
    const device = createDevice("desktop");

    registry.register(device);

    const manager = new DeviceManager(registry);

    await manager.connect("desktop");

    expect(manager.isConnected("desktop")).toBe(true);
  });

  it("disconnects a registered device", async () => {
    const registry = new DeviceRegistry();
    const device = createDevice("desktop");

    registry.register(device);

    const manager = new DeviceManager(registry);

    await manager.connect("desktop");
    await manager.disconnect("desktop");

    expect(manager.isConnected("desktop")).toBe(false);
  });

  it("returns false for unknown device connection state", () => {
    const registry = new DeviceRegistry();
    const manager = new DeviceManager(registry);

    expect(manager.isConnected("missing")).toBe(false);
  });

  it("rejects connecting unknown devices", async () => {
    const registry = new DeviceRegistry();
    const manager = new DeviceManager(registry);

    await expect(manager.connect("missing")).rejects.toThrow(
      "Device not registered: missing",
    );
  });
});
