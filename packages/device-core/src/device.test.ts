import { describe, expect, it } from "vitest";

import type { Device } from "./device.js";

describe("Device contract", () => {
  it("allows a device with metadata and connection lifecycle", async () => {
    let connected = false;

    const device: Device = {
      metadata: {
        id: "desktop",
        name: "Desktop Device",
        type: "desktop",
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

    expect(device.metadata.id).toBe("desktop");

    await device.connect();
    expect(device.isConnected()).toBe(true);

    await device.disconnect();
    expect(device.isConnected()).toBe(false);
  });
});
