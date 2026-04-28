import { BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OVERLAY_WIDTH = 480;
const OVERLAY_HEIGHT = 320;

export class AskOverlay {
  private window: BrowserWindow | null = null;

  show(): void {
    const window = this.ensureWindow();
    const position = this.computeCenteredPosition();
    window.setBounds({ ...position, width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT });
    window.show();
    window.focus();
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  sendAnswer(question: string, answer: string): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("ask-corpus:answer", { question, answer });
    }
  }

  sendError(message: string): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("ask-corpus:error", { message });
    }
  }

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
  }

  private ensureWindow(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) return this.window;

    this.window = new BrowserWindow({
      width: OVERLAY_WIDTH,
      height: OVERLAY_HEIGHT,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "..", "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.window.setAlwaysOnTop(true, "floating");
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) {
      void this.window.loadURL(`${devUrl}#/ask-overlay`);
    } else {
      void this.window.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
        hash: "/ask-overlay",
      });
    }

    this.window.webContents.on("before-input-event", (_event, input) => {
      if (input.type === "keyDown" && input.key === "Escape") {
        this.hide();
      }
    });

    this.window.on("closed", () => {
      this.window = null;
    });

    return this.window;
  }

  private computeCenteredPosition(): { x: number; y: number } {
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayMatching({
      x: cursor.x,
      y: cursor.y,
      width: 1,
      height: 1,
    });
    const bounds = display.workArea;
    const x = Math.round(bounds.x + (bounds.width - OVERLAY_WIDTH) / 2);
    const y = Math.round(bounds.y + (bounds.height - OVERLAY_HEIGHT) / 2);
    return { x, y };
  }
}

export const registerAskCorpusIpc = (overlay: AskOverlay): void => {
  ipcMain.on("ask-corpus:hide", () => {
    overlay.hide();
  });
};
