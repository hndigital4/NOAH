import { describe, expect, it } from "vitest";

import { BootManager } from "./boot-manager.js";
import { ServiceRegistry } from "./service-registry.js";

describe("BootManager", () => {
  it("starts all registered services", async () => {
    const services = new ServiceRegistry();
    const calls: string[] = [];

    services.register({
      name: "a",
      start: () => calls.push("a"),
    });

    services.register({
      name: "b",
      start: () => calls.push("b"),
    });

    const bootManager = new BootManager(services);

    await bootManager.boot();

    expect(calls).toEqual(["a", "b"]);
    expect(services.status("a")).toBe("started");
    expect(services.status("b")).toBe("started");
  });

  it("rethrows service start errors", async () => {
    const services = new ServiceRegistry();

    services.register({
      name: "bad",
      start: () => {
        throw new Error("boot failed");
      },
    });

    const bootManager = new BootManager(services);

    await expect(bootManager.boot()).rejects.toThrow("boot failed");
    expect(services.status("bad")).toBe("failed");
  });
});
