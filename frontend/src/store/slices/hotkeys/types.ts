export interface HotkeyEventFrame {
  readonly kind: "press" | "release";
  readonly accelerator: string;
  readonly observedAt: string;
}

export interface HotkeysState {
  readonly lastPress: HotkeyEventFrame | null;
  readonly lastRelease: HotkeyEventFrame | null;
  readonly sequence: number;
}

export const initialHotkeysState: HotkeysState = {
  lastPress: null,
  lastRelease: null,
  sequence: 0,
};
