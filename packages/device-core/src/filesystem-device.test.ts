import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FilesystemDevice } from "./filesystem-device.js";

describe("FilesystemDevice", () => {
  it("connects and disconnects", () => {
    const device = new FilesystemDevice();

    device.connect({
      runtimeVersion: "0.6.5",
      services: {},
    });

    expect(device.isConnected()).toBe(true);

    device.disconnect();

    expect(device.isConnected()).toBe(false);
  });

  it("writes and reads text files", async () => {
    const root = await mkdtemp(join(tmpdir(), "noah-fs-"));

    try {
      const device = new FilesystemDevice();

      device.connect({
        runtimeVersion: "0.6.5",
        services: {},
      });

      const filePath = join(root, "notes", "hello.txt");

      await device.writeText(filePath, "Hello NOAH");

      await expect(device.readText(filePath)).resolves.toBe("Hello NOAH");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("deletes files", async () => {
    const root = await mkdtemp(join(tmpdir(), "noah-fs-"));

    try {
      const device = new FilesystemDevice();

      device.connect({
        runtimeVersion: "0.6.5",
        services: {},
      });

      const filePath = join(root, "delete-me.txt");

      await device.writeText(filePath, "temporary");
      await device.delete(filePath);

      await expect(device.readText(filePath)).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects operations while disconnected", async () => {
    const device = new FilesystemDevice();

    await expect(device.readText("missing.txt")).rejects.toThrow(
      "Filesystem device is not connected",
    );
  });
});
