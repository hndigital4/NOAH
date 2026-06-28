export interface PluginServiceMap {
  readonly eventBus?: unknown;
  readonly logger?: unknown;
  readonly storage?: unknown;
  readonly scheduler?: unknown;
}

export interface PluginContext {
  readonly runtimeVersion: string;
  readonly services: PluginServiceMap;
}
