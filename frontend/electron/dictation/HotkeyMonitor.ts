import {EventEmitter} from "node:events";

import type {HotkeyEvent} from "./types";

/**
 * Subscribes to the global mouse + keyboard listener (`uiohook-napi`) and
 * emits `press` / `release` lifecycle events for the configured hotkey. The
 * orchestrator drives session start/stop off these events.
 *
 * Event is never "consumed" — the underlying system still sees the mouse-5
 * click and can forward-navigate as usual; the user opts out via macOS
 * System Preferences per ADR-002 D1.
 */
export class HotkeyMonitor extends EventEmitter {
    private started = false;
    private uiohook: UiohookApi | null = null;
    private pressed = false;

    constructor(
        private readonly mouseButton: number,
        private readonly keyboardFallbackKeycode: number | null
    ) {
        super();
    }

    async start(): Promise<void> {
        if (this.started) return;

        try {
            const module = await import("uiohook-napi");
            this.uiohook = module as unknown as UiohookApi;
        } catch (error) {
            console.error("[dictation:hotkey] uiohook-napi unavailable:", error);
            return;
        }

        this.uiohook.uIOhook.on("mousedown", (event) => this.handleMouseDown(event));
        this.uiohook.uIOhook.on("mouseup", (event) => this.handleMouseUp(event));
        if (this.keyboardFallbackKeycode !== null) {
            this.uiohook.uIOhook.on("keydown", (event) => this.handleKeyDown(event));
            this.uiohook.uIOhook.on("keyup", (event) => this.handleKeyUp(event));
        }

        this.uiohook.uIOhook.start();
        this.started = true;
    }

    stop(): void {
        if (!this.started || !this.uiohook) return;
        try {
            this.uiohook.uIOhook.stop();
        } catch (error) {
            console.error("[dictation:hotkey] stop failed:", error);
        }
        this.started = false;
        this.pressed = false;
    }

    private handleMouseDown(event: UiohookMouseEvent): void {
        if (event.button !== this.mouseButton || this.pressed) return;
        this.pressed = true;
        this.emit("hotkey", {type: "press", source: "mouse"} satisfies HotkeyEvent);
    }

    private handleMouseUp(event: UiohookMouseEvent): void {
        if (event.button !== this.mouseButton || !this.pressed) return;
        this.pressed = false;
        this.emit("hotkey", {type: "release", source: "mouse"} satisfies HotkeyEvent);
    }

    private handleKeyDown(event: UiohookKeyboardEvent): void {
        if (event.keycode !== this.keyboardFallbackKeycode || this.pressed) return;
        this.pressed = true;
        this.emit("hotkey", {type: "press", source: "keyboard"} satisfies HotkeyEvent);
    }

    private handleKeyUp(event: UiohookKeyboardEvent): void {
        if (event.keycode !== this.keyboardFallbackKeycode || !this.pressed) return;
        this.pressed = false;
        this.emit("hotkey", {type: "release", source: "keyboard"} satisfies HotkeyEvent);
    }
}

interface UiohookMouseEvent {
    button: number;
}

interface UiohookKeyboardEvent {
    keycode: number;
}

interface UiohookApi {
    uIOhook: {
        start(): void;
        stop(): void;
        on(event: "mousedown" | "mouseup", listener: (event: UiohookMouseEvent) => void): void;
        on(event: "keydown" | "keyup", listener: (event: UiohookKeyboardEvent) => void): void;
    };
}
