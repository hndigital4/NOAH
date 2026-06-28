import { describe, expect, it, vi } from "vitest";

import type { Command } from "./command.js";
import { CommandEngine } from "./command-engine.js";
import { CommandRegistry } from "./command-registry.js";

describe("CommandEngine", () => {
  it("executes a registered command", async () => {
    const registry = new CommandRegistry();

    const command: Command<{ value: number }, { doubled: number }> = {
      id: "math.double",
      name: "Double",
      description: "Doubles a number",
      execute: (request) => ({
        success: true,
        output: {
          doubled: request.input.value * 2,
        },
      }),
    };

    registry.register(command);

    const engine = new CommandEngine(registry);

    const result = await engine.execute({
      id: "math.double",
      input: { value: 21 },
      context: {
        requestId: "test-request",
        source: "user",
        timestamp: new Date().toISOString(),
      },
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ doubled: 42 });
  });

  it("throws when command is missing", async () => {
    const registry = new CommandRegistry();
    const engine = new CommandEngine(registry);

    await expect(
      engine.execute({
        id: "missing.command",
        context: {
          requestId: "test-request",
          source: "user",
          timestamp: new Date().toISOString(),
        },
      }),
    ).rejects.toThrow("Command not found: missing.command");
  });

  it("propagates command failures", async () => {
    const registry = new CommandRegistry();
    const error = new Error("boom");

    const command: Command = {
      id: "fail.command",
      name: "Fail",
      description: "Throws",
      execute: vi.fn(() => {
        throw error;
      }),
    };

    registry.register(command);

    const engine = new CommandEngine(registry);

    await expect(
      engine.execute({
        id: "fail.command",
        context: {
          requestId: "test-request",
          source: "system",
          timestamp: new Date().toISOString(),
        },
      }),
    ).rejects.toThrow("boom");
  });
});
