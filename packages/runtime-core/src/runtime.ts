import { BootManager } from "./boot-manager.js";
import { CommandEngine } from "./command-engine.js";
import { CommandRegistry } from "./command-registry.js";
import type { RuntimeStatus } from "./lifecycle.js";
import { ServiceRegistry } from "./service-registry.js";
import { ShutdownManager } from "./shutdown-manager.js";

export class Runtime {
  private statusValue: RuntimeStatus = "created";

  readonly services = new ServiceRegistry();
  readonly commands = new CommandRegistry();
  readonly commandEngine = new CommandEngine(this.commands);

  private readonly bootManager = new BootManager(this.services);
  private readonly shutdownManager = new ShutdownManager(this.services);

  get status(): RuntimeStatus {
    return this.statusValue;
  }

  async start(): Promise<void> {
    if (this.statusValue === "ready") return;

    this.statusValue = "booting";

    try {
      await this.bootManager.boot();
      this.statusValue = "ready";
    } catch (error) {
      this.statusValue = "failed";
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.statusValue === "stopped") return;

    this.statusValue = "stopping";

    try {
      await this.shutdownManager.shutdown();
      this.statusValue = "stopped";
    } catch (error) {
      this.statusValue = "failed";
      throw error;
    }
  }
}
