export type CommandId = string;

export type CommandSource = "system" | "user" | "automation" | "plugin";

export interface CommandContext {
  readonly requestId: string;
  readonly source: CommandSource;
  readonly timestamp: string;
}

export interface CommandRequest<TInput = unknown> {
  readonly id: CommandId;
  readonly input?: TInput;
  readonly context: CommandContext;
}

export interface CommandResult<TOutput = unknown> {
  readonly success: boolean;
  readonly output?: TOutput;
  readonly error?: string;
}

export interface Command<TInput = unknown, TOutput = unknown> {
  readonly id: CommandId;
  readonly name: string;
  readonly description: string;
  execute(
    request: CommandRequest<TInput>,
  ): Promise<CommandResult<TOutput>> | CommandResult<TOutput>;
}
