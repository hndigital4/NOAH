import type { DeviceContext } from "./device-context.js";

export type DeviceType =
  | "desktop"
  | "file-system"
  | "browser"
  | "audio"
  | "camera"
  | "network"
  | "unknown";

export interface DeviceMetadata {
  readonly id: string;
  readonly name: string;
  readonly type: DeviceType;
  readonly version?: string;
}

export interface Device {
  readonly metadata: DeviceMetadata;

  connect(context: DeviceContext): Promise<void> | void;

  disconnect(): Promise<void> | void;

  isConnected(): boolean;
}
