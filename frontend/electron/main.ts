import { app, BrowserWindow, dialog, ipcMain, session, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DictationOrchestrator } from "./dictation/DictationOrchestrator";
import { stopBackend, tryStartBackend } from "./utils/backendLauncher";
import { stopSyncthing, tryStartSyncthing } from "./utils/syncthingLauncher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const BACKEND_ORIGIN = "http://localhost:5050";

let mainWindow: BrowserWindow | null = null;
let dictationOrchestrator: DictationOrchestrator | null = null;

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

  // ADR-003 D5: boot Syncthing first so we can forward its REST endpoint
  // + API key to the backend via CLI overrides. If the binary is missing
  // we log and continue — the backend still starts and the user falls
  // back to running Syncthing manually on the default port 8384.
  const syncthingConfig = await tryStartSyncthing({
    userDataDir,
    resourcesRoot: process.resourcesPath ?? path.join(__dirname, ".."),
  });
  const backendExtraArgs = syncthingConfig
    ? [
        `--Mozgoslav:SyncthingBaseUrl=${syncthingConfig.baseUrl}`,
        `--Mozgoslav:SyncthingApiKey=${syncthingConfig.apiKey}`,
      ]
    : [];
  await tryStartBackend(userDataDir, { extraArgs: backendExtraArgs });

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

  if (process.platform === "darwin") {
    void initializeDictation();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

const initializeDictation = async (): Promise<void> => {
  try {
    const helperBinaryPath = path.join(
      process.resourcesPath ?? path.join(__dirname, ".."),
      "mozgoslav-dictation-helper"
    );
    dictationOrchestrator = new DictationOrchestrator({
      helperBinaryPath,
      mouseButton: 5,
      keyboardFallbackKeycode: null,
      sampleRate: 48_000,
      injectMode: "auto",
      overlayEnabled: true,
    });
    await dictationOrchestrator.initialize(() => {
      dictationOrchestrator?.destroy();
      dictationOrchestrator = null;
      app.quit();
    });
  } catch (error) {
    console.error("[dictation] initialization failed:", error);
    dictationOrchestrator = null;
  }
};

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  dictationOrchestrator?.destroy();
  dictationOrchestrator = null;
  stopBackend();
  void stopSyncthing();
});
