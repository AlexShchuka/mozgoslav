import { EventEmitter } from "events";
import uiohook from "uiohook-napi";

export class HotkeyMonitor extends EventEmitter {
    private mouseButton: number | null;
    private keyboardFallbackKeycode: number | null;

    constructor(mouseButton: number | null, keyboardFallbackKeycode: number | null) {
        super();
        this.mouseButton = mouseButton;
        this.keyboardFallbackKeycode = keyboardFallbackKeycode;
    }

    setMouseButton(button: number | null): void {
        this.mouseButton = button;
    }

    async start(): Promise<void> {
        uiohook.on("mousedown", (event) => this.handleMouseDown(event));
        uiohook.on("mouseup", (event) => this.handleMouseUp(event));
        if (this.keyboardFallbackKeycode !== null) {
            uiohook.on("keydown", (event) => this.handleKeyDown(event));
            uiohook.on("keyup", (event) => this.handleKeyUp(event));
        }
    }

    stop(): void {
        uiohook.removeAllListeners();
    }

    private handleMouseDown(event: uiohook.MouseEvent): void {
        if (this.mouseButton === null) return;
        if (event.button !== this.mouseButton || this.pressed) return;
        this.pressed = true;
        this.emit("hotkey", { type: "press" });
    }

    private handleMouseUp(event: uiohook.MouseEvent): void {
        if (this.mouseButton === null) return;
        if (event.button !== this.mouseButton || !this.pressed) return;
        this.pressed = false;
        this.emit("hotkey", { type: "release" });
    }

    private handleKeyDown(event: uiohook.KeyboardEvent): void {
        if (this.keyboardFallbackKeycode === null) return;
        if (event.keyCode !== this.keyboardFallbackKeycode || this.pressed) return;
        this.pressed = true;
        this.emit("hotkey", { type: "press" });
    }

    private handleKeyUp(event: uiohook.KeyboardEvent): void {
        if (this.keyboardFallbackKeycode === null) return;
        if (event.keyCode !== this.keyboardFallbackKeycode || !this.pressed) return;
        this.pressed = false;
        this.emit("hotkey", { type: "release" });
    }

    private pressed = false;
}
```