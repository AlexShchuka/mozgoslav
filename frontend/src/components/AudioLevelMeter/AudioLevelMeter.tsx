import { FC, useEffect, useRef } from "react";

import { Bar, MeterFill, MeterRoot, Peak } from "./AudioLevelMeter.style";

export interface AudioLevelMeterProps {
  readonly stream?: MediaStream | null;
  readonly height?: number;
  readonly ariaLabel?: string;
  readonly testId?: string;
}

const UPDATE_INTERVAL_MS = 50;
const PEAK_FALL_PER_SEC = 1.5;

const AudioLevelMeter: FC<AudioLevelMeterProps> = ({ stream, height = 8, ariaLabel, testId }) => {
  const rmsRef = useRef<HTMLDivElement | null>(null);
  const peakRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const peakValueRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) {
      if (rmsRef.current) rmsRef.current.style.transform = "scaleX(0)";
      if (peakRef.current) peakRef.current.style.left = "0%";
      return;
    }
    const AudioCtxCtor =
      (
        globalThis as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        }
      ).AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxCtor) {
      return;
    }
    const audioCtx = new AudioCtxCtor();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    let lastUpdate = 0;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - lastUpdate < UPDATE_INTERVAL_MS) return;
      lastUpdate = now;
      analyser.getFloatTimeDomainData(buffer);
      let sumSq = 0;
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const sample = buffer[i]!;
        sumSq += sample * sample;
        const abs = Math.abs(sample);
        if (abs > peak) peak = abs;
      }
      const rms = Math.sqrt(sumSq / buffer.length);
      const displayRms = Math.min(1, rms * 2);

      const dtSec = (Date.now() - lastTickRef.current) / 1000;
      lastTickRef.current = Date.now();
      peakValueRef.current = Math.max(
        Math.min(1, peak),
        peakValueRef.current - PEAK_FALL_PER_SEC * dtSec
      );

      if (rmsRef.current) {
        rmsRef.current.style.transform = `scaleX(${displayRms.toFixed(3)})`;
      }
      if (peakRef.current) {
        peakRef.current.style.left = `${(peakValueRef.current * 100).toFixed(1)}%`;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      void audioCtx.close();
    };
  }, [stream]);

  return (
    <MeterRoot
      $height={height}
      role="meter"
      aria-label={ariaLabel ?? "audio level"}
      aria-valuemin={0}
      aria-valuemax={1}
      data-testid={testId ?? "audio-level-meter"}
    >
      <Bar>
        <MeterFill ref={rmsRef} data-testid="audio-level-meter-rms" />
      </Bar>
      <Peak ref={peakRef} data-testid="audio-level-meter-peak" />
    </MeterRoot>
  );
};

export default AudioLevelMeter;
