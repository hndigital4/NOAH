import type { Command, CommandId } from "./command.js";

export class CommandRegistry {
  private readonly commands = new Map<CommandId, Command>();

  register(command: Command): void {
    if (this.commands.has(command.id)) {
      throw new Error(`Command already registered: ${command.id}`);
    }

    this.commands.set(command.id, command);
  }

  get<T extends Command = Command>(id: CommandId): T {
    const command = this.commands.get(id);

    if (command === undefined) {
      throw new Error(`Command not found: ${id}`);
    }

    return command as T;
  }

  has(id: CommandId): boolean {
    return this.commands.has(id);
  }

  list(): readonly Command[] {
    return [...this.commands.values()];
  }
}
