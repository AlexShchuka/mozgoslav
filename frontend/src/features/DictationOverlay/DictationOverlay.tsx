import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import {
  OverlayRoot,
  PartialText,
  PhaseLabel,
  Spinner,
  TextColumn,
  Waveform,
} from "./DictationOverlay.style";
import type { DictationOverlayPhase, DictationOverlayState } from "./types";

interface DictationOverlayProps {
  readonly initialState?: DictationOverlayState;
}

/**
 * Renderer for the floating push-to-talk overlay window. Subscribes to the
 * `dictation:overlay-state` IPC channel that the main process sends through
 * the preload bridge, and draws:
 *   - a waveform (energy levels) while recording,
 *   - the live partial transcript centred horizontally,
 *   - a spinner during processing.
 *
 * The overlay never takes focus: the underlying target app keeps keyboard
 * input throughout the session.
 */
const DictationOverlay: FC<DictationOverlayProps> = ({ initialState }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<DictationOverlayState>(
    initialState ?? { phase: "idle", partialText: "", levels: [] }
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const api = (window as unknown as MozgoslavOverlayApi).mozgoslavOverlay;
    if (!api) return undefined;
    const unsubscribe = api.onStateChange((next) => setState(next));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const levels = state.levels ?? [];
    if (levels.length === 0) return;

    const barWidth = Math.max(2, Math.floor(width / levels.length));
    ctx.fillStyle = state.phase === "recording" ? "#d94848" : "#888888";
    for (let i = 0; i < levels.length; i++) {
      const level = Math.max(0, Math.min(1, levels[i]!));
      const barHeight = Math.floor(level * height);
      const x = i * barWidth;
      const y = Math.floor((height - barHeight) / 2);
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  }, [state.levels, state.phase]);

  return (
    <OverlayRoot data-testid="dictation-overlay" aria-live="polite">
      <Waveform ref={canvasRef} width={72} height={48} data-testid="dictation-overlay-waveform" />
      <TextColumn>
        <PhaseLabel $phase={state.phase} data-testid="dictation-overlay-phase">
          {labelFor(state.phase, t)}
        </PhaseLabel>
        <PartialText data-testid="dictation-overlay-text">
          {state.partialText || placeholderFor(state.phase, t)}
        </PartialText>
      </TextColumn>
      {state.phase === "processing" && <Spinner data-testid="dictation-overlay-spinner" />}
    </OverlayRoot>
  );
};

const labelFor = (phase: DictationOverlayPhase, t: TFunction): string => {
  switch (phase) {
    case "recording":
      return t("dictation.overlay.recording");
    case "processing":
      return t("dictation.overlay.processing");
    case "injecting":
      return t("dictation.overlay.injecting");
    case "error":
      return t("dictation.overlay.error");
    default:
      return t("dictation.overlay.idle");
  }
};

const placeholderFor = (phase: DictationOverlayPhase, t: TFunction): string => {
  if (phase === "recording") return t("dictation.overlay.listening");
  if (phase === "processing") return t("dictation.overlay.finalizing");
  return "";
};

interface MozgoslavOverlayApi {
  mozgoslavOverlay?: {
    onStateChange: (listener: (state: DictationOverlayState) => void) => () => void;
  };
}

export default DictationOverlay;
