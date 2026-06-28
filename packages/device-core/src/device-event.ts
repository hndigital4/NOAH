export enum DeviceEventType {
  Connected = "device.connected",
  Disconnected = "device.disconnected",
  Error = "device.error",
}

export interface DeviceEvent {
  readonly deviceId: string;
  readonly type: DeviceEventType;
  readonly timestamp: number;
  readonly message?: string;
}
