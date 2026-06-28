import { ServiceRegistry } from "./service-registry.js";

export class ShutdownManager {
  constructor(
    private readonly services: ServiceRegistry,
  ) {}

  async shutdown(): Promise<void> {
    await this.services.stopAll();
  }
}
