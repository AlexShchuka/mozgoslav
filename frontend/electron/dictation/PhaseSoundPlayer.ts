import {spawn} from "node:child_process";

import type {DictationPhase} from "./types";

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
