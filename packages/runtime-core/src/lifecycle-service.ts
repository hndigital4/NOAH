export interface LifecycleService {
  readonly name: string;

  start?(): Promise<void> | void;

  stop?(): Promise<void> | void;

  health?(): Promise<boolean> | boolean;
}
