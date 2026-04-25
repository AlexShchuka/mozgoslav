import { app, BrowserWindow, dialog, ipcMain, session, shell, systemPreferences } from "electron";
import path from "node:path";
import { existsSync, promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

import { DictationOrchestrator } from "./dictation/DictationOrchestrator";
import { DumpModeOrchestrator } from "./dictation/DumpModeOrchestrator";
import { NativeHelperClient } from "./dictation/NativeHelperClient";
import {
  registerGlobalDictationHotkey,
  unregisterGlobalDictationHotkey,
} from "./dictation/globalHotkey";
import { RecordingBridge } from "./recording/RecordingBridge";
import { stopBackend, tryStartBackend } from "./utils/backendLauncher";
import { stopSyncthing, tryStartSyncthing } from "./utils/syncthingLauncher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const BACKEND_ORIGIN = "http://localhost:5050";

const resolveDictationHelperPath = (): string => {
  if (process.env.MOZGOSLAV_DICTATION_HELPER_BIN) {
    return process.env.MOZGOSLAV_DICTATION_HELPER_BIN;
  }

  if (app.isPackaged) {
    return path.join(process.resourcesPath, "mozgoslav-dictation-helper");
  }

  const candidates = [
    path.resolve(
      __dirname,
      "..",
      "..",
      "helpers",
      "MozgoslavDictationHelper",
      ".build",
      "release",
      "mozgoslav-dictation-helper"
    ),
    path.resolve(
      __dirname,
      "..",
      "..",
      "helpers",
      "MozgoslavDictationHelper",
      ".build",
      "arm64-apple-macosx",
      "release",
      "mozgoslav-dictation-helper"
    ),
    path.resolve(
      __dirname,
      "..",
      "..",
      "helpers",
      "MozgoslavDictationHelper",
      ".build",
      "x86_64-apple-macosx",
      "release",
      "mozgoslav-dictation-helper"
    ),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `[recording:bridge] mozgoslav-dictation-helper not found. Tried:\n${candidates.join("\n")}`
    );
  }

  return found;
};

let mainWindow: BrowserWindow | null = null;
let dictationOrchestrator: DictationOrchestrator | null = null;
let dumpModeOrchestrator: DumpModeOrchestrator | null = null;
let recordingBridge: RecordingBridge | null = null;
let recordingHelper: NativeHelperClient | null = null;

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

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const parsed = new URL(url);
    const allowed = [DEV_SERVER_URL, BACKEND_ORIGIN, "app://mozgoslav"]
      .filter(Boolean)
      .some((origin) => origin && parsed.origin === new URL(origin).origin);
    if (!allowed) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (DEV_SERVER_URL) {
    void mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.whenReady().then(async () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            `connect-src 'self' ${BACKEND_ORIGIN} ws://localhost:5173 http://localhost:5173 ws://localhost:5050 ws://127.0.0.1:5050`,
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
  const recorderEnv: Record<string, string> = {};
  if (process.platform === "darwin") {
    ensureParentAccessibility();
    try {
      const helperBinaryPath = resolveDictationHelperPath();
      recordingHelper = new NativeHelperClient(helperBinaryPath);
      recordingHelper.start();
      recordingBridge = new RecordingBridge(recordingHelper);
      const port = await recordingBridge.start();
      recorderEnv["Mozgoslav__AudioRecorder__ElectronBridgePort"] = String(port);
    } catch (err) {
      console.error("[recording:bridge] failed to start:", err);
      recordingBridge = null;
      recordingHelper = null;
    }
  }

  await tryStartBackend(userDataDir, {
    resourcesRoot: process.resourcesPath ?? path.join(__dirname, ".."),
    extraArgs: backendExtraArgs,
    extraEnv: recorderEnv,
  });

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

  ipcMain.handle("permissions:isAccessibilityTrusted", async () => {
    if (process.platform !== "darwin") return true;
    return systemPreferences.isTrustedAccessibilityClient(false);
  });

  ipcMain.handle("permissions:requestAccessibility", async () => {
    if (process.platform !== "darwin") return true;
    const trusted = systemPreferences.isTrustedAccessibilityClient(true);
    if (!trusted) {
      void shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
      );
    }
    return trusted;
  });

  const EXTERNAL_URL_PREFIXES = [
    "http://",
    "https://",
    "mailto:",
    "x-apple.systempreferences:",
  ] as const;
  ipcMain.handle("shell:openExternal", async (_, url: string) => {
    if (typeof url !== "string") return false;
    if (!EXTERNAL_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      console.warn(`[shell:openExternal] rejected non-whitelisted URL: ${url}`);
      return false;
    }
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error("[shell:openExternal] failed:", error);
      return false;
    }
  });

  ipcMain.handle("dialog:openModelFile", async () => {
    if (!mainWindow) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(mainWindow, {
      title: "Выбери модель Whisper / VAD",
      properties: ["openFile"],
      filters: [{ name: "Whisper / VAD models", extensions: ["bin", "gguf"] }],
    });
  });

  ipcMain.handle("dialog:openModelFolder", async () => {
    if (!mainWindow) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(mainWindow, {
      title: "Выбери папку с моделями",
      properties: ["openDirectory"],
    });
  });

  ipcMain.handle("record:start", async (_event, outputPath: string) => {
    if (!recordingHelper) {
      throw new Error("Native recorder is only available on macOS with a running helper.");
    }
    const sessionId = `renderer-${Date.now()}`;
    await recordingHelper.startFileCapture(outputPath, sessionId);
    return { sessionId };
  });

  ipcMain.handle("record:stop", async (_event, sessionId: string) => {
    if (!recordingHelper) {
      throw new Error("Native recorder is only available on macOS with a running helper.");
    }
    return recordingHelper.stopFileCapture(sessionId);
  });

  ipcMain.handle(
    "dictation:inject",
    async (_event, text: string, mode: "auto" | "cgevent" | "accessibility") => {
      if (!text) return;
      if (!dictationOrchestrator) {
        throw new Error("Dictation orchestrator is not ready.");
      }
      await dictationOrchestrator.injectText(text, mode);
    }
  );

  ipcMain.on("dictation:cancel-request", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("dictation:cancel-from-overlay");
    }
  });

  ipcMain.handle("sync:listConflicts", async (_event, folderPath: string) => {
    try {
      const walked = await walkForConflicts(folderPath);
      return walked.map((p) => ({
        folderId: folderPath,
        path: p.replace(folderPath, ""),
        conflictPath: p,
      }));
    } catch {
      return [];
    }
  });

  createWindow();

  const defaultHotkeyOk = registerGlobalDictationHotkey();
  if (!defaultHotkeyOk) {
    console.warn(
      "[globalShortcut] Failed to register CommandOrControl+Shift+Space — likely a conflicting OS binding."
    );
  }

  if (process.platform === "darwin") {
    await initializeDictation();
    await initializeDumpMode();
  }
  void applyCustomHotkeyFromSettings();
  void applyDumpModeFromSettings();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

const applyCustomHotkeyFromSettings = async (): Promise<void> => {
  const maxAttempts = 8;
  const delayMs = 750;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BACKEND_ORIGIN}/api/settings`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const settings = (await response.json()) as {
        dictationKeyboardHotkey?: string;
        dictationPushToTalk?: boolean;
      };
      const custom = settings.dictationKeyboardHotkey?.trim() ?? "";
      const pushToTalk = settings.dictationPushToTalk === true;
      console.info("=".repeat(70));
      console.info(
        `[hotkey] CHECKPOINT settings.custom='${custom}' settings.pushToTalk=${pushToTalk} orchestratorReady=${dictationOrchestrator !== null}`
      );

      if (pushToTalk && dictationOrchestrator && custom) {
        unregisterGlobalDictationHotkey();
        console.info("[hotkey]   unregistered Electron globalShortcut");
        try {
          console.info(
            `[hotkey] PATH -> Swift helper keyboard push-to-talk (cursor injection enabled) accelerator='${custom}'`
          );
          await dictationOrchestrator.configurePushToTalk({
            mouseButton: null,
            keyboardAccelerator: custom,
          });
        } catch (err) {
          console.warn("[hotkey] push-to-talk setup FAILED:", err);
          console.warn("[hotkey] FALLBACK -> Electron globalShortcut toggle (NO cursor injection)");
          registerGlobalDictationHotkey(custom);
        }
        return;
      }

      if (!custom) {
        console.info(
          "[hotkey] PATH -> default Electron globalShortcut (no custom, toggle mode, no cursor injection)"
        );
        return;
      }
      console.info(
        "[hotkey] PATH -> custom Electron globalShortcut (toggle mode, NO cursor injection)"
      );
      unregisterGlobalDictationHotkey();
      const ok = registerGlobalDictationHotkey(custom);
      if (!ok) {
        console.warn(
          `[globalShortcut] Failed to register custom accelerator '${custom}'. Falling back to default.`
        );
        registerGlobalDictationHotkey();
      }
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  console.warn(
    "[globalShortcut] Backend unreachable after 8 attempts — keeping default accelerator."
  );
};

const ensureParentAccessibility = (): boolean => {
  if (process.platform !== "darwin") return true;
  const trusted = systemPreferences.isTrustedAccessibilityClient(true);
  if (!trusted) {
    console.warn(
      "[permissions] Accessibility not granted to the Electron parent. " +
        "Hotkey monitor in the Swift helper will not receive events until " +
        "the user grants access in System Settings → Privacy → Accessibility."
    );
  }
  return trusted;
};

const initializeDumpMode = async (): Promise<void> => {
  if (!recordingHelper) {
    console.warn("[dump-mode] recordingHelper not ready, skipping dump-mode init");
    return;
  }
  try {
    const tempDir = path.join(app.getPath("temp"), "mozgoslav-dump");
    await fs.mkdir(tempDir, { recursive: true });
    dumpModeOrchestrator = new DumpModeOrchestrator({
      helper: recordingHelper,
      backendOrigin: BACKEND_ORIGIN,
      tempDir,
      overlayEnabled: true,
    });
  } catch (error) {
    console.error("[dump-mode] initialization failed:", error);
    dumpModeOrchestrator = null;
  }
};

const applyDumpModeFromSettings = async (): Promise<void> => {
  const maxAttempts = 8;
  const delayMs = 750;
  const query = `query { settings { dictationDumpEnabled dictationDumpHotkeyToggle dictationDumpHotkeyHold } }`;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BACKEND_ORIGIN}/graphql`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const payload = (await response.json()) as {
        data?: {
          settings?: {
            dictationDumpEnabled?: boolean;
            dictationDumpHotkeyToggle?: string;
            dictationDumpHotkeyHold?: string;
          };
        };
      };
      const settings = payload.data?.settings ?? {};
      if (!dumpModeOrchestrator) {
        console.info("[dump-mode] orchestrator not initialized, skipping settings apply");
        return;
      }
      if (settings.dictationDumpEnabled !== true) {
        console.info("[dump-mode] disabled in settings — unbinding all dump hotkeys");
        await dumpModeOrchestrator.unbindAll();
        return;
      }
      const toggle = settings.dictationDumpHotkeyToggle?.trim() ?? "";
      const hold = settings.dictationDumpHotkeyHold?.trim() ?? "";
      console.info(`[dump-mode] applying settings toggle='${toggle}' hold='${hold}'`);
      await dumpModeOrchestrator.bindToggle(toggle.length > 0 ? toggle : null);
      await dumpModeOrchestrator.bindHold(hold.length > 0 ? hold : null);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  console.warn(
    "[dump-mode] backend unreachable after 8 attempts — dump-mode disabled this session."
  );
};

const initializeDictation = async (): Promise<void> => {
  try {
    const helperBinaryPath = resolveDictationHelperPath();
    dictationOrchestrator = new DictationOrchestrator({
      helperBinaryPath,
      mouseButton: null,
      keyboardFallbackKeycode: null,
      keyboardAccelerator: null,
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
const walkForConflicts = async (rootPath: string, maxDepth = 8): Promise<string[]> => {
  const results: string[] = [];
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > maxDepth) return;
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }> = [];
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as unknown as typeof entries;
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, String(entry.name));
      if (entry.isDirectory()) {
        await walk(abs, depth + 1);
      } else if (entry.isFile() && String(entry.name).includes(".sync-conflict-")) {
        results.push(abs);
      }
    }
  };
  await walk(rootPath, 0);
  return results;
};

app.on("window-all-closed", () => {
  app.quit();
});

let teardownStarted = false;

app.on("before-quit", (event) => {
  if (teardownStarted) return;
  teardownStarted = true;
  event.preventDefault();
  void (async () => {
    try {
      dictationOrchestrator?.destroy();
      dictationOrchestrator = null;
      dumpModeOrchestrator?.destroy();
      dumpModeOrchestrator = null;
      recordingBridge?.stop();
      recordingBridge = null;
      recordingHelper?.stop();
      recordingHelper = null;
      await Promise.allSettled([stopBackend(), stopSyncthing()]);
    } finally {
      app.exit(0);
    }
  })();
});

app.on("will-quit", () => {
  unregisterGlobalDictationHotkey();
});
