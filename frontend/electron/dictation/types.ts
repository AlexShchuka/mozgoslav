export type DictationPhase = "idle" | "recording" | "processing" | "injecting" | "error";

export interface HotkeyEvent {
  readonly type: "press" | "release";
  readonly source: "mouse" | "keyboard";
}

export interface AudioChunkPayload {
  readonly samples: readonly number[];
  readonly sampleRate: number;
  readonly offsetMs: number;
}

export interface FocusedTarget {
  readonly bundleId: string;
  readonly appName: string;
  readonly useAX: boolean;
}

export interface FinalTranscript {
  readonly rawText: string;
  readonly polishedText: string;
  readonly durationMs: number;
}
