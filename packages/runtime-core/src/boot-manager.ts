import { ServiceRegistry } from "./service-registry.js";

export class BootManager {
  constructor(
    private readonly services: ServiceRegistry,
  ) {}

  async boot(): Promise<void> {
    await this.services.startAll();
  }
}
