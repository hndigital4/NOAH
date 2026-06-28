import { describe, expect, it } from "vitest";

import { Runtime } from "./runtime.js";

describe("Runtime", () => {
  it("starts in created state", () => {
    const runtime = new Runtime();

    expect(runtime.status).toBe("created");
  });

  it("moves to ready after start", async () => {
    const runtime = new Runtime();

    await runtime.start();

    expect(runtime.status).toBe("ready");
  });

  it("starts registered services", async () => {
    const runtime = new Runtime();
    const calls: string[] = [];

    runtime.services.register({
      name: "test-service",
      start: () => calls.push("start"),
    });

    await runtime.start();

    expect(calls).toEqual(["start"]);
    expect(runtime.services.status("test-service")).toBe("started");
  });

  it("moves to stopped after stop", async () => {
    const runtime = new Runtime();

    await runtime.start();
    await runtime.stop();

    expect(runtime.status).toBe("stopped");
  });

  it("stops services in reverse order", async () => {
    const runtime = new Runtime();
    const calls: string[] = [];

    runtime.services.register({
      name: "a",
      stop: () => calls.push("a"),
    });

    runtime.services.register({
      name: "b",
      stop: () => calls.push("b"),
    });

    await runtime.start();
    await runtime.stop();

    expect(calls).toEqual(["b", "a"]);
  });

  it("moves to failed if service start fails", async () => {
    const runtime = new Runtime();

    runtime.services.register({
      name: "bad-service",
      start: () => {
        throw new Error("boot failed");
      },
    });

    await expect(runtime.start()).rejects.toThrow("boot failed");
    expect(runtime.status).toBe("failed");
  });

  it("moves to failed if service stop fails", async () => {
    const runtime = new Runtime();

    runtime.services.register({
      name: "bad-service",
      stop: () => {
        throw new Error("shutdown failed");
      },
    });

    await runtime.start();

    await expect(runtime.stop()).rejects.toThrow("shutdown failed");
    expect(runtime.status).toBe("failed");
  });

  it("exposes command engine", () => {
    const runtime = new Runtime();

    expect(runtime.commandEngine).toBeDefined();
  });
});
