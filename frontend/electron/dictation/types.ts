/**
 * Shared types for the Electron-side dictation pipeline. The orchestrator
 * glues together the hotkey monitor, the native helper client, the backend
 * SSE subscription, the overlay window, and the tray. Every module exports
 * only what the orchestrator needs to wire them together.
 */

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
