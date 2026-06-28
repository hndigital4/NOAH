import { describe, expect, it } from "vitest";

import { PluginState } from "./plugin-state.js";

describe("PluginState", () => {
  it("contains the expected lifecycle states", () => {
    expect(PluginState.Installed).toBe("installed");
    expect(PluginState.Loaded).toBe("loaded");
    expect(PluginState.Active).toBe("active");
    expect(PluginState.Inactive).toBe("inactive");
    expect(PluginState.Unloaded).toBe("unloaded");
  });
});
