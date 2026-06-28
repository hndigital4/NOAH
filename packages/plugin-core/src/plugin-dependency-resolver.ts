import type { PluginManifest } from "./plugin-manifest.js";
import { PluginRegistry } from "./plugin-registry.js";

export class PluginDependencyResolver {
  public constructor(
    private readonly registry: PluginRegistry,
  ) {}

  public findMissingDependencies(manifest: PluginManifest): readonly string[] {
    const dependencies = manifest.dependencies ?? [];

    return dependencies.filter((dependencyId) => {
      return !this.registry.has(dependencyId);
    });
  }

  public canActivate(manifest: PluginManifest): boolean {
    return this.findMissingDependencies(manifest).length === 0;
  }
}
