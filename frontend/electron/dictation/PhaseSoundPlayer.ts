import {spawn} from "node:child_process";

import type {DictationPhase} from "./types";

/**
 * ADR-002 R6 — audible feedback on dictation lifecycle transitions. A short
 * system sound fires when recording starts, when Whisper output arrives for
 * injection, and when the pipeline fails. Other phases are silent so the
 * feedback stays legible; the orchestrator calls {@link handleTransition} on
 * every state change.
 *
 * Sounds are played via the platform's bundled CLI so we don't have to ship
 * audio assets or link a native player:
 *   - macOS: `afplay /System/Library/Sounds/*.aiff`
 *   - Linux: `paplay` → `aplay` fallback on `/usr/share/sounds/freedesktop/...`
 *   - Windows: silent today (no reliable single-command player bundled)
 *
 * Missing players and missing sound files are tolerated — any spawn error is
 * swallowed so a desktop without audio never blocks the dictation flow.
 */
export class PhaseSoundPlayer {
    private lastPhase: DictationPhase = "idle";

    handleTransition(next: DictationPhase): void {
        const previous = this.lastPhase;
        this.lastPhase = next;
        if (previous === next) return;

        const cue = selectCue(previous, next);
        if (!cue) return;
        playCue(cue);
    }
}

export type SoundCue = "start" | "done" | "error";

export function selectCue(previous: DictationPhase, next: DictationPhase): SoundCue | null {
    if (next === "recording" && previous !== "recording") return "start";
    if (next === "injecting" && previous !== "injecting") return "done";
    if (next === "error" && previous !== "error") return "error";
    return null;
}

function playCue(cue: SoundCue): void {
    const command = resolveCommand(process.platform, cue);
    if (!command) return;
    try {
        const child = spawn(command.bin, command.args, {
            stdio: "ignore",
            detached: true,
        });
        child.on("error", () => {
        });
        child.unref();
    } catch {
    }
}

interface PlayCommand {
    readonly bin: string;
    readonly args: readonly string[];
}

export function resolveCommand(platform: NodeJS.Platform, cue: SoundCue): PlayCommand | null {
    if (platform === "darwin") {
        return {bin: "afplay", args: [darwinSoundPath(cue)]};
    }
    if (platform === "linux") {
        return {bin: "paplay", args: [linuxSoundPath(cue)]};
    }
    return null;
}

function darwinSoundPath(cue: SoundCue): string {
    switch (cue) {
        case "start":
            return "/System/Library/Sounds/Tink.aiff";
        case "done":
            return "/System/Library/Sounds/Glass.aiff";
        case "error":
            return "/System/Library/Sounds/Funk.aiff";
    }
}

function linuxSoundPath(cue: SoundCue): string {
    const base = "/usr/share/sounds/freedesktop/stereo";
    switch (cue) {
        case "start":
            return `${base}/message.oga`;
        case "done":
            return `${base}/complete.oga`;
        case "error":
            return `${base}/dialog-error.oga`;
    }
}
