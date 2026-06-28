import type {
  Plugin,
  PluginContext,
} from "@noah/plugin-core";

const plugin: Plugin = {
  metadata: {
    id: "hello",
    name: "Hello Plugin",
    version: "0.1.0",
    capabilities: ["command"],
  },

  activate(context: PluginContext): void {
    console.log(
      `[HelloPlugin] Runtime ${context.runtimeVersion}`,
    );
  },

  deactivate(): void {
    console.log("[HelloPlugin] Shutdown");
  },
};

export default plugin;
