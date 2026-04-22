import { app } from "electron";
import { NativeHelperClient, type HotkeyEventPayload } from "./NativeHelperClient";
import { HotkeyMonitor } from "./HotkeyMonitor";
import { OverlayWindow } from "./OverlayWindow";
import { PhaseSoundPlayer } from "./PhaseSoundPlayer";
import { TrayManager } from "./TrayManager";

interface AudioChunkPayload {
    readonly data: number[];
}

export interface OrchestratorOptions {
    readonly helperBinaryPath: string;
    readonly mouseButton: number | null;
    readonly keyboardFallbackKeycode: number | null;
    readonly keyboardAccelerator: string | null;
    readonly sampleRate: number;
    readonly injectMode: "auto" | "cgevent" | "accessibility";
    readonly overlayEnabled: boolean;
}

export class DictationOrchestrator {
    private readonly options: OrchestratorOptions;
    private readonly hotkey: HotkeyMonitor;
    private readonly helper: NativeHelperClient;
    private readonly overlay: OverlayWindow;
    private readonly tray: TrayManager;
    private readonly sound: PhaseSoundPlayer;

    private phase: "idle" | "recording" = "idle";
    private sessionId: string | null = null;

    constructor(private readonly options: OrchestratorOptions) {
        this.hotkey = new HotkeyMonitor(options.mouseButton, options.keyboardFallbackKeycode);
        this.helper = new NativeHelperClient(options.helperBinaryPath);
        this.overlay = new OverlayWindow();
        this.tray = new TrayManager();
        this.sound = new PhaseSoundPlayer();
    }

    async initialize(onQuit: () => void): Promise<void> {
        this.tray.build(onQuit);
        this.helper.start();
        this.helper.on("audio", (chunk: AudioChunkPayload) => {
            void this.pushAudioToBackend(chunk);
        });
        this.helper.on("hotkey", (payload: HotkeyEventPayload) => {
            if (payload.kind === "press") void this.handlePress();
            else void this.handleRelease();
        });

        if (this.options.mouseButton !== null) {
            this.hotkey.on("hotkey", (event) => {
                if (event.type === "press") void this.handlePress();
                else void this.handleRelease();
            });
            await this.hotkey.start();
        }

        if (this.options.keyboardAccelerator) {
            await this.helper.startHotkey(this.options.keyboardAccelerator);
        }
    }

    async configurePushToTalk(options: {
        mouseButton: number | null;
        keyboardAccelerator: string | null;
    }): Promise<void> {
        if (options.mouseButton !== null) {
            this.hotkey.setMouseButton(options.mouseButton);
            await this.hotkey.start();
        } else {
            this.hotkey.stop();
        }

        if (options.keyboardAccelerator) {
            await this.helper.startHotkey(options.keyboardAccelerator);
        } else {
            await this.helper.stopHotkey();
        }
    }

    async startKeyboardHotkey(accelerator: string): Promise<void> {
        await this.helper.startHotkey(accelerator);
    }

    async stopKeyboardHotkey(): Promise<void> {
        await this.helper.stopHotkey();
    }

    onKeyboardHotkeyEvent(cb: (payload: HotkeyEventPayload) => void): void {
        this.helper.on("hotkey", cb);
    }

    private async handlePress(): Promise<void> {
        if (this.phase !== "idle") return;
        this.phase = "recording";
        this.sessionId = crypto.randomUUID();
        await this.sound.playStart();
        await this.overlay.showRecording(this.options.injectMode, this.options.overlayEnabled);
        try {
            const response = await fetch(`${process.env.BACKEND_ORIGIN || "http://localhost:8080"}/api/dictation/push/${this.sessionId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sampleRate: this.options.sampleRate }),
            });
            if (!response.ok) throw new Error(`start failed: ${response.status}`);
        } catch (error) {
            console.error("[dictation] start error:", error);
            await this.abort();
        }
    }

    private async handleRelease(): Promise<void> {
        if (this.phase !== "recording") return;
        try {
            const response = await fetch(`${process.env.BACKEND_ORIGIN || "http://localhost:8080"}/api/dictation/stop/${this.sessionId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            if (!response.ok) throw new Error(`stop failed: ${response.status}`);
            const result = (await response.json()) as { polishedText: string };
            await this.overlay.hide();
            await this.sound.playStop();
            await this.helper.injectText(result.polishedText, this.options.injectMode);
        } catch (error) {
            console.error("[dictation] stop error:", error);
            await this.abort();
        }
    }

    private async abort(): Promise<void> {
        if (!this.sessionId) return;
        try {
            const response = await fetch(`${process.env.BACKEND_ORIGIN || "http://localhost:8080"}/api/dictation/abort/${this.sessionId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            if (!response.ok) console.warn("[dictation] abort failed:", response.status);
        } catch (error) {
            console.error("[dictation] abort error:", error);
        }
    }

    private async pushAudioToBackend(chunk: AudioChunkPayload): Promise<void> {
        if (this.phase !== "recording" || !this.sessionId) return;
        try {
            const response = await fetch(`${process.env.BACKEND_ORIGIN || "http://localhost:8080"}/api/dictation/push/${this.sessionId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ samples: chunk.data }),
            });
            if (!response.ok) console.warn("[dictation] push failed:", response.status);
        } catch (error) {
            console.error("[dictation] push error:", error);
        }
    }

    destroy(): void {
        this.hotkey.stop();
        this.helper.stop();
        this.overlay.destroy();
        this.tray.destroy();
    }
}
```

frontend/electron/dictation/HotkeyMonitor.ts
