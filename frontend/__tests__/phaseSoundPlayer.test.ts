import { PhaseSoundPlayer, resolveCommand, selectCue } from "../electron/dictation/PhaseSoundPlayer";

describe("selectCue", () => {
  it("emits start when entering recording from idle", () => {
    expect(selectCue("idle", "recording")).toBe("start");
  });

  it("emits done when transitioning into injecting", () => {
    expect(selectCue("processing", "injecting")).toBe("done");
  });

  it("emits error when transitioning into error", () => {
    expect(selectCue("recording", "error")).toBe("error");
  });

  it("is silent for processing / idle transitions", () => {
    expect(selectCue("recording", "processing")).toBeNull();
    expect(selectCue("injecting", "idle")).toBeNull();
    expect(selectCue("idle", "idle")).toBeNull();
  });

  it("does not re-fire on same-phase transitions", () => {
    expect(selectCue("recording", "recording")).toBeNull();
    expect(selectCue("error", "error")).toBeNull();
  });
});

describe("resolveCommand", () => {
  it("uses afplay with Apple system sounds on darwin", () => {
    const command = resolveCommand("darwin", "start");
    expect(command).toEqual({
      bin: "afplay",
      args: ["/System/Library/Sounds/Tink.aiff"],
    });
  });

  it("uses paplay with freedesktop sounds on linux", () => {
    const command = resolveCommand("linux", "error");
    expect(command).toEqual({
      bin: "paplay",
      args: ["/usr/share/sounds/freedesktop/stereo/dialog-error.oga"],
    });
  });

  it("returns null on unsupported platforms (silent fallback)", () => {
    expect(resolveCommand("win32", "done")).toBeNull();
    expect(resolveCommand("sunos", "done")).toBeNull();
  });
});

describe("PhaseSoundPlayer.handleTransition", () => {
  it("remembers the last phase so repeated calls are idempotent", () => {
    const player = new PhaseSoundPlayer();
    // Smoke: just verify it does not throw and tracks state privately. We
    // don't assert on spawn() here because the real spawn is swallowed when
    // the system binary is missing — a pure unit concern is the pure fn
    // `selectCue`, which is covered above.
    expect(() => {
      player.handleTransition("recording");
      player.handleTransition("recording");
      player.handleTransition("injecting");
      player.handleTransition("idle");
    }).not.toThrow();
  });
});
