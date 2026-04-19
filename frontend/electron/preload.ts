import { contextBridge, ipcRenderer } from "electron";

export interface GlobalHotkeyPayload {
  source: "global-hotkey";
}

export interface MozgoslavBridge {
  version: string;
  openAudioFiles: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  openFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  openPath: (path: string) => Promise<string | undefined>;
  /**
   * Opens a URL in the user's default handler via Electron's `shell.openExternal`.
   * Only a fixed set of schemes is forwarded by the main-process handler
   * (http, https, mailto, x-apple.systempreferences); anything else is refused
   * so renderer-originating URLs cannot reach arbitrary OS handlers.
   *
   * Primary use: the Onboarding permissions cards need to deeplink into
   * System Settings; `window.open("x-apple.systempreferences:…")` is silently
   * blocked by the hardened `setWindowOpenHandler` that only allows http(s).
   */
  openExternal: (url: string) => Promise<boolean>;
  /**
   * Read-only probe of Accessibility trust on the Electron parent process.
   * Returns true outside macOS — renderer UIs should treat that as "n/a".
   */
  isAccessibilityTrusted: () => Promise<boolean>;
  /**
   * Trigger the native macOS Accessibility prompt on the Electron parent
   * process (macOS 13+ children inherit the grant). If the prompt was
   * suppressed by a prior denial, also deeplinks the user into System
   * Settings → Privacy → Accessibility. Returns the post-call trust state.
   */
  requestAccessibility: () => Promise<boolean>;
  openModelFile: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  openModelFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  listSyncConflicts: (
    folderPath: string,
  ) => Promise<Array<{ folderId: string; path: string; conflictPath: string }>>;
  /**
   * Subscribe to the global dictation hotkey (Cmd/Ctrl+Shift+Space).
   * Returns an unsubscribe function. The callback fires on every accelerator
   * press; the renderer treats it the same as the mouse-5 entry point.
   */
  onGlobalHotkey: (
    listener: (payload: GlobalHotkeyPayload) => void,
  ) => () => void;
  /**
   * Plan v0.8 Block 3 — optional renderer-driven native recording path.
   * The primary flow is backend-driven (`POST /api/recordings/start`); these
   * methods expose the same bridge to the renderer for features that do not
   * go through the backend (manual UX flows).
   */
  startNativeRecording?: (outputPath: string) => Promise<{ sessionId: string }>;
  stopNativeRecording?: (sessionId: string) => Promise<{ path: string; durationMs: number }>;
}

export interface DictationOverlayState {
  phase: "idle" | "recording" | "processing" | "injecting" | "error";
  partialText: string;
  levels?: number[];
}

export interface MozgoslavOverlayBridge {
  onStateChange: (listener: (state: DictationOverlayState) => void) => () => void;
}

const GLOBAL_HOTKEY_CHANNEL = "mozgoslav:global-hotkey-toggle";

const bridge: MozgoslavBridge = {
  version: "0.1.0",
  openAudioFiles: () => ipcRenderer.invoke("dialog:openAudioFiles"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  openPath: (path) => ipcRenderer.invoke("shell:openPath", path),
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  isAccessibilityTrusted: () => ipcRenderer.invoke("permissions:isAccessibilityTrusted"),
  requestAccessibility: () => ipcRenderer.invoke("permissions:requestAccessibility"),
  openModelFile: () => ipcRenderer.invoke("dialog:openModelFile"),
  openModelFolder: () => ipcRenderer.invoke("dialog:openModelFolder"),
  listSyncConflicts: (folderPath) =>
    ipcRenderer.invoke("sync:listConflicts", folderPath),
  onGlobalHotkey: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: GlobalHotkeyPayload) =>
      listener(payload);
    ipcRenderer.on(GLOBAL_HOTKEY_CHANNEL, handler);
    return () => {
      ipcRenderer.removeListener(GLOBAL_HOTKEY_CHANNEL, handler);
    };
  },
  startNativeRecording: (outputPath) =>
    ipcRenderer.invoke("record:start", outputPath),
  stopNativeRecording: (sessionId) =>
    ipcRenderer.invoke("record:stop", sessionId),
};

const overlayBridge: MozgoslavOverlayBridge = {
  onStateChange: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, state: DictationOverlayState) =>
      listener(state);
    ipcRenderer.on("dictation:overlay-state", handler);
    return () => {
      ipcRenderer.removeListener("dictation:overlay-state", handler);
    };
  },
};

contextBridge.exposeInMainWorld("mozgoslav", bridge);
contextBridge.exposeInMainWorld("mozgoslavOverlay", overlayBridge);
