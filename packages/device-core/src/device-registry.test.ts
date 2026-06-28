import { describe, expect, it } from "vitest";

import type { Device } from "./device.js";
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

describe("DeviceRegistry", () => {
  it("registers and retrieves a device", () => {
    const registry = new DeviceRegistry();
    const device = createDevice("desktop");

    registry.register(device);

    expect(registry.has("desktop")).toBe(true);
    expect(registry.get("desktop")).toBe(device);
  });

  it("lists registered devices", () => {
    const registry = new DeviceRegistry();

    registry.register(createDevice("desktop"));
    registry.register(createDevice("browser"));

    expect(registry.list()).toHaveLength(2);
  });

  it("unregisters a device", () => {
    const registry = new DeviceRegistry();

    registry.register(createDevice("desktop"));
    registry.unregister("desktop");

    expect(registry.has("desktop")).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const registry = new DeviceRegistry();

    registry.register(createDevice("desktop"));

    expect(() => registry.register(createDevice("desktop"))).toThrow(
      "Device already registered: desktop",
    );
  });
});
