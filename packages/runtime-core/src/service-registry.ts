export type ServiceStatus = "registered" | "started" | "stopped" | "failed";

export interface RuntimeService {
  readonly name: string;
  start?: () => Promise<void> | void;
  stop?: () => Promise<void> | void;
}

export class ServiceRegistry {
  private readonly services = new Map<string, RuntimeService>();
  private readonly statuses = new Map<string, ServiceStatus>();

  register(service: RuntimeService): void {
    if (this.services.has(service.name)) {
      throw new Error(`Service already registered: ${service.name}`);
    }

    this.services.set(service.name, service);
    this.statuses.set(service.name, "registered");
  }

  get<T extends RuntimeService = RuntimeService>(name: string): T {
    const service = this.services.get(name);
    if (service === undefined) throw new Error(`Service not found: ${name}`);
    return service as T;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  list(): readonly string[] {
    return [...this.services.keys()];
  }

  status(name: string): ServiceStatus {
    const status = this.statuses.get(name);
    if (status === undefined) throw new Error(`Service not found: ${name}`);
    return status;
  }

  async startAll(): Promise<void> {
    for (const service of this.services.values()) {
      try {
        await service.start?.();
        this.statuses.set(service.name, "started");
      } catch (error) {
        this.statuses.set(service.name, "failed");
        throw error;
      }
    }
  }

  async stopAll(): Promise<void> {
    const services = [...this.services.values()].reverse();

    for (const service of services) {
      try {
        await service.stop?.();
        this.statuses.set(service.name, "stopped");
      } catch (error) {
        this.statuses.set(service.name, "failed");
        throw error;
      }
    }
  }
}
