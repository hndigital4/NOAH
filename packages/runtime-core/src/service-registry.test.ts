import { describe, expect, it, vi } from "vitest";
import { ServiceRegistry } from "./service-registry.js";

describe("ServiceRegistry", () => {
  it("registers and retrieves a service", () => {
    const registry = new ServiceRegistry();
    const service = { name: "logger" };

    registry.register(service);

    expect(registry.has("logger")).toBe(true);
    expect(registry.get("logger")).toBe(service);
    expect(registry.status("logger")).toBe("registered");
  });

  it("prevents duplicate registration", () => {
    const registry = new ServiceRegistry();

    registry.register({ name: "eventbus" });

    expect(() => registry.register({ name: "eventbus" })).toThrow(
      "Service already registered: eventbus",
    );
  });

  it("throws for missing services", () => {
    const registry = new ServiceRegistry();

    expect(() => registry.get("missing")).toThrow("Service not found: missing");
    expect(() => registry.status("missing")).toThrow("Service not found: missing");
  });

  it("lists services in registration order", () => {
    const registry = new ServiceRegistry();

    registry.register({ name: "eventbus" });
    registry.register({ name: "logger" });
    registry.register({ name: "scheduler" });

    expect(registry.list()).toEqual(["eventbus", "logger", "scheduler"]);
  });

  it("starts all services in registration order", async () => {
    const registry = new ServiceRegistry();
    const order: string[] = [];

    registry.register({ name: "a", start: () => order.push("a") });
    registry.register({ name: "b", start: () => order.push("b") });

    await registry.startAll();

    expect(order).toEqual(["a", "b"]);
    expect(registry.status("a")).toBe("started");
    expect(registry.status("b")).toBe("started");
  });

  it("stops all services in reverse order", async () => {
    const registry = new ServiceRegistry();
    const order: string[] = [];

    registry.register({ name: "a", stop: () => order.push("a") });
    registry.register({ name: "b", stop: () => order.push("b") });

    await registry.stopAll();

    expect(order).toEqual(["b", "a"]);
    expect(registry.status("a")).toBe("stopped");
    expect(registry.status("b")).toBe("stopped");
  });

  it("marks service failed on start failure", async () => {
    const registry = new ServiceRegistry();
    const error = new Error("start failed");

    registry.register({ name: "bad", start: vi.fn(() => { throw error; }) });

    await expect(registry.startAll()).rejects.toThrow("start failed");
    expect(registry.status("bad")).toBe("failed");
  });

  it("marks service failed on stop failure", async () => {
    const registry = new ServiceRegistry();
    const error = new Error("stop failed");

    registry.register({ name: "bad", stop: vi.fn(() => { throw error; }) });

    await expect(registry.stopAll()).rejects.toThrow("stop failed");
    expect(registry.status("bad")).toBe("failed");
  });
});
