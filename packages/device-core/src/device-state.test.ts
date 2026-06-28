import { describe, expect, it } from "vitest";

import { DeviceState } from "./device-state.js";

describe("DeviceState", () => {
  it("contains the expected lifecycle states", () => {
    expect(DeviceState.Disconnected).toBe("disconnected");
    expect(DeviceState.Connecting).toBe("connecting");
    expect(DeviceState.Connected).toBe("connected");
    expect(DeviceState.Disconnecting).toBe("disconnecting");
  });
});
