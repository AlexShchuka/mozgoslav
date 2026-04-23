import { useEffect } from "react";

import { BACKEND_URL } from "../constants/api";

export interface HotkeyEventFrame {
  kind: "press" | "release";
  accelerator: string;
  observedAt: string;
}

export interface UsePushToTalkHandlers {
  onPress?: (event: HotkeyEventFrame) => void;
  onRelease?: (event: HotkeyEventFrame) => void;
}

export const usePushToTalk = (handlers: UsePushToTalkHandlers): void => {
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const url = `${BACKEND_URL}/api/hotkey/stream`;
    const source = new EventSource(url);
    const handle = (ev: MessageEvent) => {
      try {
        const frame = JSON.parse(ev.data) as HotkeyEventFrame;
        if (frame.kind === "press") handlers.onPress?.(frame);
        else if (frame.kind === "release") handlers.onRelease?.(frame);
      } catch {}
    };
    source.addEventListener("hotkey", handle);
    source.onmessage = handle;
    source.onerror = () => {};
    return () => {
      source.close();
    };
  }, [handlers]);
};
