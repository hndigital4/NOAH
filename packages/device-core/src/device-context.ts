export interface DeviceServiceMap {
  readonly eventBus?: unknown;
  readonly logger?: unknown;
  readonly storage?: unknown;
  readonly scheduler?: unknown;
}

export interface DeviceContext {
  readonly runtimeVersion: string;
  readonly services: DeviceServiceMap;
}
