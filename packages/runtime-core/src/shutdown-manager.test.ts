import { describe, expect, it } from "vitest";

import { ServiceRegistry } from "./service-registry.js";
import { ShutdownManager } from "./shutdown-manager.js";

describe("ShutdownManager", () => {
  it("stops all registered services in reverse order", async () => {
    const services = new ServiceRegistry();
    const calls: string[] = [];

    services.register({ name: "a", stop: () => calls.push("a") });
    services.register({ name: "b", stop: () => calls.push("b") });

    const shutdownManager = new ShutdownManager(services);

    await shutdownManager.shutdown();

    expect(calls).toEqual(["b", "a"]);
    expect(services.status("a")).toBe("stopped");
    expect(services.status("b")).toBe("stopped");
  });

  it("rethrows service stop errors", async () => {
    const services = new ServiceRegistry();

    services.register({
      name: "bad",
      stop: () => {
        throw new Error("shutdown failed");
      },
    });

    const shutdownManager = new ShutdownManager(services);

    await expect(shutdownManager.shutdown()).rejects.toThrow("shutdown failed");
    expect(services.status("bad")).toBe("failed");
  });
});
