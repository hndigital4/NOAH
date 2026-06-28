import { ServiceRegistry } from "./service-registry.js";

export class CommandContext {
  constructor(
    public readonly services: ServiceRegistry,
  ) {}
}
