import {EventEmitter} from "node:events";

import type {HotkeyEvent} from "./types";

export class HotkeyMonitor extends EventEmitter {
    private started = false;
    private uiohook: UiohookApi | null = null;
    private pressed = false;
    private mouseButton: number | null;

    constructor(
        mouseButton: number | null,
        private readonly keyboardFallbackKeycode: number | null
    ) {
        super();
        this.mouseButton = mouseButton;
    }

    setMouseButton(button: number | null): void {
        this.mouseButton = button;
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
            this.uiohook.uIOhook.removeAllListeners();
            this.uiohook.uIOhook.stop();
        } catch (error) {
            console.error("[dictation:hotkey] stop failed:", error);
        }
        this.started = false;
        this.pressed = false;
    }

    private handleMouseDown(event: UiohookMouseEvent): void {
        if (this.mouseButton === null) return;
        if (event.button !== this.mouseButton || this.pressed) return;
        this.pressed = true;
        this.emit("hotkey", {type: "press", source: "mouse"} satisfies HotkeyEvent);
    }

    private handleMouseUp(event: UiohookMouseEvent): void {
        if (this.mouseButton === null) return;
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
        removeAllListeners(): void;
        on(event: "mousedown" | "mouseup", listener: (event: UiohookMouseEvent) => void): void;
        on(event: "keydown" | "keyup", listener: (event: UiohookKeyboardEvent) => void): void;
    };
}
