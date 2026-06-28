import type { CommandRequest, CommandResult } from "./command.js";
import { CommandRegistry } from "./command-registry.js";

export class CommandEngine {
  constructor(
    private readonly registry: CommandRegistry,
  ) {}

  async execute(request: CommandRequest): Promise<CommandResult> {
    const command = this.registry.get(request.id);
    return await command.execute(request);
  }
}
