import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

import { selectLastHotkeyPress, selectLastHotkeyRelease } from "../store/slices/hotkeys";
import type { HotkeyEventFrame } from "../store/slices/hotkeys";

export type { HotkeyEventFrame };

export interface UsePushToTalkHandlers {
  onPress?: (event: HotkeyEventFrame) => void;
  onRelease?: (event: HotkeyEventFrame) => void;
}

export const usePushToTalk = (handlers: UsePushToTalkHandlers): void => {
  const lastPress = useSelector(selectLastHotkeyPress);
  const lastRelease = useSelector(selectLastHotkeyRelease);
  const lastPressSeenRef = useRef<string | null>(null);
  const lastReleaseSeenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastPress) return;
    if (lastPressSeenRef.current === lastPress.observedAt) return;
    lastPressSeenRef.current = lastPress.observedAt;
    handlers.onPress?.(lastPress);
  }, [lastPress, handlers]);

  useEffect(() => {
    if (!lastRelease) return;
    if (lastReleaseSeenRef.current === lastRelease.observedAt) return;
    lastReleaseSeenRef.current = lastRelease.observedAt;
    handlers.onRelease?.(lastRelease);
  }, [lastRelease, handlers]);
};
