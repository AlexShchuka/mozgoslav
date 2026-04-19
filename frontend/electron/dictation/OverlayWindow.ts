import {BrowserWindow, screen} from "electron";
import path from "node:path";
import {fileURLToPath} from "node:url";

import type {DictationPhase} from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OVERLAY_WIDTH = 340;
const OVERLAY_HEIGHT = 80;
const CURSOR_OFFSET_X = 20;
const CURSOR_OFFSET_Y = 20;
const FADE_MS = 500;

/**
 * Lazy floating overlay window. Created on first show, reused afterwards.
 * Positioned next to the cursor on the same display (Wispr Flow style) with
 * clamping to keep the whole rect on-screen. Non-focusable and transparent so
 * the user never loses focus in the underlying target app.
 */
export class OverlayWindow {
    private window: BrowserWindow | null = null;
    private hideTimer: NodeJS.Timeout | null = null;

    show(): void {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        const window = this.ensureWindow();
        const position = this.computePositionNextToCursor();
        window.setBounds({...position, width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT});
        if (!window.isVisible()) window.showInactive();
    }

    updateState(phase: DictationPhase, partialText: string): void {
        const window = this.window;
        if (!window || window.isDestroyed()) return;
        window.webContents.send("dictation:overlay-state", {phase, partialText});
        if (phase === "error") {
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
            if (window.isVisible()) window.hide();
        }
    }

    scheduleHide(): void {
        if (this.hideTimer) clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => {
            if (this.window && !this.window.isDestroyed()) this.window.hide();
            this.hideTimer = null;
        }, FADE_MS);
    }

    destroy(): void {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        if (this.window && !this.window.isDestroyed()) this.window.destroy();
        this.window = null;
    }

    private ensureWindow(): BrowserWindow {
        if (this.window && !this.window.isDestroyed()) return this.window;

        this.window = new BrowserWindow({
            width: OVERLAY_WIDTH,
            height: OVERLAY_HEIGHT,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            focusable: false,
            show: false,
            hasShadow: false,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
            },
        });

        this.window.setAlwaysOnTop(true, "screen-saver");
        this.window.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true});

        const devUrl = process.env.VITE_DEV_SERVER_URL;
        if (devUrl) {
            void this.window.loadURL(`${devUrl}#/dictation-overlay`);
        } else {
            void this.window.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
                hash: "/dictation-overlay",
            });
        }

        return this.window;
    }

    private computePositionNextToCursor(): { x: number; y: number } {
        const cursor = screen.getCursorScreenPoint();
        const display = screen.getDisplayMatching({
            x: cursor.x,
            y: cursor.y,
            width: 1,
            height: 1,
        });
        const bounds = display.workArea;

        let x = cursor.x + CURSOR_OFFSET_X;
        let y = cursor.y + CURSOR_OFFSET_Y;

        if (x + OVERLAY_WIDTH > bounds.x + bounds.width) {
            x = bounds.x + bounds.width - OVERLAY_WIDTH;
        }
        if (y + OVERLAY_HEIGHT > bounds.y + bounds.height) {
            y = bounds.y + bounds.height - OVERLAY_HEIGHT;
        }
        if (x < bounds.x) x = bounds.x;
        if (y < bounds.y) y = bounds.y;

        return {x, y};
    }
}
