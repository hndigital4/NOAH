import { describe, expect, it } from "vitest";

import type { Command } from "./command.js";
import { CommandRegistry } from "./command-registry.js";

describe("CommandRegistry", () => {
  const createCommand = (id: string): Command => ({
    id,
    name: id,
    description: `Command ${id}`,
    execute: () => ({ success: true }),
  });

  it("registers and retrieves commands", () => {
    const registry = new CommandRegistry();
    const command = createCommand("system.status");

    registry.register(command);

    expect(registry.has("system.status")).toBe(true);
    expect(registry.get("system.status")).toBe(command);
  });

  it("prevents duplicate registrations", () => {
    const registry = new CommandRegistry();

    registry.register(createCommand("system.status"));

    expect(() =>
      registry.register(createCommand("system.status")),
    ).toThrow("Command already registered: system.status");
  });

  it("throws when a command is missing", () => {
    const registry = new CommandRegistry();

    expect(() => registry.get("missing")).toThrow(
      "Command not found: missing",
    );
  });

  it("lists registered commands", () => {
    const registry = new CommandRegistry();

    registry.register(createCommand("a"));
    registry.register(createCommand("b"));
    registry.register(createCommand("c"));

    expect(registry.list().map((c) => c.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
