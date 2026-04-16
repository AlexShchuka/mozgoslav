import { app, BrowserWindow, dialog, ipcMain, session, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stopBackend, tryStartBackend } from "./utils/backendLauncher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const BACKEND_ORIGIN = "http://localhost:5050";

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0b0d12",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  });

  // Block navigation to anything outside our app + backend + Vite dev server.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const parsed = new URL(url);
    const allowed = [DEV_SERVER_URL, BACKEND_ORIGIN, "app://mozgoslav"]
      .filter(Boolean)
      .some((origin) => origin && parsed.origin === new URL(origin).origin);
    if (!allowed) {
      event.preventDefault();
    }
  });

  // Route any window.open or target="_blank" to the user's default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (DEV_SERVER_URL) {
    void mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.whenReady().then(async () => {
  // Tighten Content-Security-Policy for the renderer.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            `connect-src 'self' ${BACKEND_ORIGIN} ws://localhost:5173 http://localhost:5173`,
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
          ].join("; "),
        ],
      },
    });
  });

  const userDataDir = app.getPath("userData");
  await tryStartBackend(userDataDir);

  ipcMain.handle("dialog:openAudioFiles", async () => {
    if (!mainWindow) return { filePaths: [] };
    return dialog.showOpenDialog(mainWindow, {
      title: "Выбери аудио",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Audio", extensions: ["mp3", "m4a", "wav", "mp4", "ogg", "flac", "webm", "aac"] },
      ],
    });
  });

  ipcMain.handle("dialog:openFolder", async () => {
    if (!mainWindow) return { filePaths: [] };
    return dialog.showOpenDialog(mainWindow, {
      title: "Выбери папку",
      properties: ["openDirectory"],
    });
  });

  ipcMain.handle("shell:openPath", async (_, targetPath: string) => {
    const error = await shell.openPath(targetPath);
    return error || undefined;
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBackend();
});
