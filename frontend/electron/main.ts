import { app, BrowserWindow, dialog, ipcMain, session, shell, systemPreferences } from "electron";
import path from "node:path";
import { existsSync, promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

import { DictationOrchestrator } from "./dictation/DictationOrchestrator";
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
            "mozgoslav-dictation-helper",
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
            "mozgoslav-dictation-helper",
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
            "mozgoslav-dictation-helper",
        ),
    ];

    const found = candidates.find((candidate) => existsSync(candidate));
    if (!found) {
        throw new Error(
            `[recording:bridge] mozgoslav-dictation-helper not found. Tried:\n${candidates.join("\n")}`,
        );
    }

    return found;
};

let mainWindow: BrowserWindow | null = null;
let dictationOrchestrator: DictationOrchestrator | null = null;
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
              "script-src 'self' 'unsafe-inline'",
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
  // AVFoundation recorder bridge. Start the dedicated helper process +
  // internal loopback HTTP endpoint before the backend so the port is
  // available via IConfiguration at backend spawn time
  // (appsettings key: Mozgoslav:AudioRecorder:ElectronBridgePort).
  const recorderEnv: Record<string, string> = {};
  if (process.platform === "darwin") {
    // macOS TCC is parent-process scoped: Accessibility is granted to the
    // Electron.app (dev) or Mozgoslav.app (packaged) — spawned children
    // inherit trust on macOS 13+. Trigger the native prompt here, BEFORE we
    // spawn the Swift helper, so `NSEvent.addGlobalMonitorForEvents` inside
    // the helper starts receiving events on the first successful grant.
    // `isTrustedAccessibilityClient(true)` both probes and prompts.
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

  // Accessibility trust lives on the parent Electron process — renderer
  // surfaces (Onboarding, Settings) drive the prompt via these channels.
  // `prompt=true` variant triggers the native macOS dialog; the read-only
  // variant is safe for polling UI state without side-effects.
  ipcMain.handle("permissions:isAccessibilityTrusted", async () => {
    if (process.platform !== "darwin") return true;
    return systemPreferences.isTrustedAccessibilityClient(false);
  });

  ipcMain.handle("permissions:requestAccessibility", async () => {
    if (process.platform !== "darwin") return true;
    const trusted = systemPreferences.isTrustedAccessibilityClient(true);
    if (!trusted) {
      // macOS suppresses the prompt once the user has denied (or dismissed)
      // it, so we also deeplink them into the right Settings pane — at least
      // the path to grant is one click away either way.
      void shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
      );
    }
    return trusted;
  });

  // Onboarding permission cards need to deeplink into System Settings
  // (`x-apple.systempreferences:…`). `window.open` is blocked for non-http
  // URLs by `setWindowOpenHandler` above, so we route via IPC and gate
  // forwarding to a known-safe scheme whitelist — renderer-originating URLs
  // must not be able to reach arbitrary OS handlers.
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

  // BC-033 — model-file picker filters to Whisper/VAD extensions.
  ipcMain.handle("dialog:openModelFile", async () => {
    if (!mainWindow) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(mainWindow, {
      title: "Выбери модель Whisper / VAD",
      properties: ["openFile"],
      filters: [{ name: "Whisper / VAD models", extensions: ["bin", "gguf"] }],
    });
  });

  // BC-033 — folder picker for batch model scan (`/api/models/scan?dir=`).
  ipcMain.handle("dialog:openModelFolder", async () => {
    if (!mainWindow) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(mainWindow, {
      title: "Выбери папку с моделями",
      properties: ["openDirectory"],
    });
  });

  // Plan v0.8 Block 3 — renderer-driven recording via NativeHelper. Thin
  // passthroughs to the in-process RecordingBridge so renderer features that
  // do not go through the backend can still record.
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

  // BC-050 — lists every `.sync-conflict-*` file under the given folder path.
  // Called by the Sync > Conflicts sub-view; resolution itself is manual via
  // Finder (see `docs/sync-conflicts.md`).
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

  // Register the global dictation accelerator on every platform. Starts
  // with the default (Cmd/Ctrl+Shift+Space) so the app is usable even if
  // the backend hasn't finished booting; once settings are reachable we
  // swap to the user's custom binding (task #10).
  const defaultHotkeyOk = registerGlobalDictationHotkey();
  if (!defaultHotkeyOk) {
    console.warn(
      "[globalShortcut] Failed to register CommandOrControl+Shift+Space — likely a conflicting OS binding.",
    );
  }
  void applyCustomHotkeyFromSettings();

  if (process.platform === "darwin") {
    void initializeDictation();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Task #10 — swap the default dictation accelerator for the user-configured
 * one once the backend is reachable. Polls `/api/settings` with a short
 * back-off. When `dictationPushToTalk=true` (NEXT H1) we skip globalShortcut
 * entirely and forward the native helper's keyDown/keyUp events to the
 * backend instead, so the renderer can drive true push-to-talk via SSE.
 */
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

      if (pushToTalk && dictationOrchestrator && custom) {
        // NEXT H1 — hand the accelerator to the Swift helper; we no longer
        // want globalShortcut firing a keyDown-only toggle on the same combo.
        unregisterGlobalDictationHotkey();
        try {
          dictationOrchestrator.onKeyboardHotkeyEvent((payload) => {
            void forwardHotkeyToBackend(payload);
          });
          await dictationOrchestrator.startKeyboardHotkey(custom);
          console.log(`[hotkey] push-to-talk monitor started for '${custom}'.`);
        } catch (err) {
          console.warn("[hotkey] failed to start native monitor; falling back to globalShortcut toggle:", err);
          registerGlobalDictationHotkey(custom);
        }
        return;
      }

      if (!custom) return; // user hasn't set anything — keep default toggle.
      unregisterGlobalDictationHotkey();
      const ok = registerGlobalDictationHotkey(custom);
      if (!ok) {
        console.warn(
          `[globalShortcut] Failed to register custom accelerator '${custom}'. Falling back to default.`,
        );
        registerGlobalDictationHotkey();
      }
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  console.warn("[globalShortcut] Backend unreachable after 8 attempts — keeping default accelerator.");
};

/**
 * NEXT H1 — forward every helper-emitted hotkey press/release to the
 * backend so the SSE bus relays it to the renderer.
 */
const forwardHotkeyToBackend = async (payload: {
  kind: string;
  accelerator: string;
  observedAt: string;
}): Promise<void> => {
  try {
    await fetch(`${BACKEND_ORIGIN}/_internal/hotkey/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[hotkey] failed to forward helper event to backend:", err);
  }
};

/**
 * Probe + prompt Accessibility on the Electron parent process. macOS 13+
 * TCC inheritance means a trusted parent lets its spawned children (the
 * Swift helper we use for `NSEvent.addGlobalMonitorForEvents`) see input
 * events without a separate System Settings entry. Returns the current
 * trust state after the prompt call — callers usually don't read it,
 * they just want the side-effect of showing the dialog once.
 */
const ensureParentAccessibility = (): boolean => {
  if (process.platform !== "darwin") return true;
  const trusted = systemPreferences.isTrustedAccessibilityClient(true);
  if (!trusted) {
    console.warn(
      "[permissions] Accessibility not granted to the Electron parent. " +
        "Hotkey monitor in the Swift helper will not receive events until " +
        "the user grants access in System Settings → Privacy → Accessibility.",
    );
  }
  return trusted;
};

const initializeDictation = async (): Promise<void> => {
    try {
        const helperBinaryPath = resolveDictationHelperPath();
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
// BC-050 helper — depth-first walk for `.sync-conflict-*` filenames. Stays
// inside the electron main process to avoid exposing fs access to the
// renderer. Cap depth to avoid runaway walks on very deep vaults.
const walkForConflicts = async (
  rootPath: string,
  maxDepth = 8,
): Promise<string[]> => {
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

// Closing the main window tears down the whole app, including the ASP.NET
// backend and the Swift dictation helper. Per-user preference: a Mozgoslav
// without a window is not useful, and leaving orphaned `dotnet` / helper
// processes running in the background is the top paper-cut on macOS. We
// diverge from the default AppKit semantics (where the app stays resident)
// on purpose — `before-quit` handles the actual cleanup.
app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  dictationOrchestrator?.destroy();
  dictationOrchestrator = null;
  recordingBridge?.stop();
  recordingBridge = null;
  recordingHelper?.stop();
  recordingHelper = null;
  stopBackend();
  void stopSyncthing();
});

// Electron docs explicitly recommend unregistering global shortcuts in
// `will-quit`. Double registration is safe, but double unregistration is a
// no-op anyway.
app.on("will-quit", () => {
  unregisterGlobalDictationHotkey();
});
