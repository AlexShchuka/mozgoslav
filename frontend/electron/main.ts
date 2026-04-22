import { app, globalShortcut } from "electron";
import { resolve } from "path";

let dictationOrchestrator: import("./dictation/DictationOrchestrator").DictationOrchestrator | null = null;

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:8080";

const registerGlobalDictationHotkey = (accelerator?: string): boolean => {
    const ok = globalShortcut.register(accelerator || "CommandOrControl+7", () => {
        console.info("[globalShortcut] fallback toggle pressed");
    });
    return ok;
};

const unregisterGlobalDictationHotkey = (): void => {
    globalShortcut.unregisterAll();
};

const resolveDictationHelperPath = (): string => {
    const helperName = process.platform === "darwin" ? "MozgoslavDictationHelper" : "MozgoslavDictationHelper.exe";
    return resolve(__dirname, "..", "helpers", helperName);
};

const initializeDictation = async (): Promise<void> => {
    try {
        const helperBinaryPath = resolveDictationHelperPath();
        dictationOrchestrator = new (await import("./dictation/DictationOrchestrator")).DictationOrchestrator({
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

const applyCustomHotkeyFromSettings = async (): Promise<void> => {
    const maxAttempts = 8;
    const delayMs = 750;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await fetch(`${BACKEND_ORIGIN}/api/settings`);
            if (!response.ok) throw new Error(`status ${response.status}`);
            const settings = (await response.json()) as {
                dictationKeyboardHotkey?: string;
                dictationMouseButton?: number;
                dictationHotkeyType?: string;
                dictationPushToTalk?: boolean;
            };
            const custom = settings.dictationKeyboardHotkey?.trim() ?? "";
            const pushToTalk = settings.dictationPushToTalk === true;
            const hotkeyType = settings.dictationHotkeyType ?? "mouse";
            const mouseButton = settings.dictationMouseButton ?? 5;

            console.info("=".repeat(70));
            console.info(
                `[hotkey] CHECKPOINT settings.custom='${custom}' settings.pushToTalk=${pushToTalk} settings.hotkeyType='${hotkeyType}' settings.mouseButton=${mouseButton} orchestratorReady=${dictationOrchestrator !== null}`,
            );

            if (pushToTalk && dictationOrchestrator) {
                unregisterGlobalDictationHotkey();
                console.info("[hotkey]   unregistered Electron globalShortcut");
                try {
                    if (hotkeyType === "keyboard" && custom) {
                        console.info(`[hotkey] PATH -> Swift helper keyboard push-to-talk (cursor injection) accelerator='${custom}'`);
                        await dictationOrchestrator.configurePushToTalk({
                            mouseButton: null,
                            keyboardAccelerator: custom,
                        });
                    } else {
                        console.info(`[hotkey] PATH -> uiohook mouse push-to-talk (cursor injection) button=${mouseButton}`);
                        await dictationOrchestrator.configurePushToTalk({
                            mouseButton,
                            keyboardAccelerator: null,
                        });
                    }
                } catch (err) {
                    console.warn("[hotkey] push-to-talk setup FAILED:", err);
                    console.warn("[hotkey] FALLBACK -> Electron globalShortcut toggle (NO cursor injection)");
                    registerGlobalDictationHotkey(custom || undefined);
                }
                return;
            }

            if (!custom) {
                console.info("[hotkey] PATH -> default Electron globalShortcut (toggle mode, no cursor injection)");
                return;
            }
            console.info("[hotkey] PATH -> custom Electron globalShortcut (toggle mode, no cursor injection)");
            unregisterGlobalDictationHotkey();
            const ok = registerGlobalDictationHotkey(custom);
            if (!ok) {
                console.warn(
                    `[globalShortcut] Failed to register custom accelerator '${custom}'. Falling back to default.`,
                );
                registerGlobalDictationHotkey();
            }
            return;
        } catch (error) {
            if (attempt === maxAttempts - 1) {
                console.warn("[hotkey] settings fetch failed after retries:", error);
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
};

app.on("ready", () => {
    createWindow();
    initializeDictation();
});

const createWindow = (): void => {
    // placeholder
};
```

frontend/electron/dictation/HotkeyMonitor.ts
