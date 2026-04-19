export type DictationOverlayPhase = "idle" | "recording" | "processing" | "injecting" | "error";

export interface DictationOverlayState {
    readonly phase: DictationOverlayPhase;
    readonly partialText: string;
    readonly levels?: readonly number[];
}
