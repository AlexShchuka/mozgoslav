import { DictationOrchestrator } from "../dictation/DictationOrchestrator";
import { HotkeyMonitor } from "../dictation/HotkeyMonitor";

jest.mock("uiohook-napi", () => ({
    on: jest.fn(),
    removeAllListeners: jest.fn(),
}));

jest.mock("../dictation/NativeHelperClient", () => {
    const EventEmitter = require("events");
    class MockNativeHelperClient extends EventEmitter {
        start() {}
        stop() {}
        async startHotkey(_accelerator: string) {}
        async stopHotkey() {}
        async injectText(_text: string, _mode: string) {}
    }
    return { NativeHelperClient: MockNativeHelperClient };
});

describe("DictationOrchestrator", () => {
    let orchestrator: DictationOrchestrator;
    const helperBinaryPath = "/fake/path";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(async () => {
        if (orchestrator) {
            orchestrator.destroy();
            orchestrator = null as any;
        }
    });

    test("handles Swift helper hotkey press/release and triggers backend start/stop", async () => {
        const options = {
            helperBinaryPath,
            mouseButton: null,
            keyboardFallbackKeycode: null,
            keyboardAccelerator: "Right-Option",
            sampleRate: 48_000,
            injectMode: "auto",
            overlayEnabled: false,
        };
        orchestrator = new DictationOrchestrator(options);

        const helper = (orchestrator as any).helper;
        const hotkeyMonitor = (orchestrator as any).hotkey;

        await orchestrator.initialize(() => {});

        expect(helper.startHotkey).toHaveBeenCalledWith("Right-Option");

        const startSpy = jest.spyOn(orchestrator as any, "handlePress");
        const stopSpy = jest.spyOn(orchestrator as any, "handleRelease");

        helper.emit("hotkey", { kind: "press" });
        expect(startSpy).toHaveBeenCalled();

        (orchestrator as any).sessionId = "test-session";
        helper.emit("hotkey", { kind: "release" });
        expect(stopSpy).toHaveBeenCalled();
    });

    test("configurePushToTalk switches to keyboard mode", async () => {
        orchestrator = new DictationOrchestrator({
            helperBinaryPath,
            mouseButton: null,
            keyboardFallbackKeycode: null,
            keyboardAccelerator: null,
            sampleRate: 48_000,
            injectMode: "auto",
            overlayEnabled: false,
        });

        await orchestrator.initialize(() => {});
        const helper = (orchestrator as any).helper;
        const hotkeyMonitor = (orchestrator as any).hotkey;

        await orchestrator.configurePushToTalk({
            mouseButton: null,
            keyboardAccelerator: "CommandOrControl+7",
        });

        expect(helper.startHotkey).toHaveBeenCalledWith("CommandOrControl+7");
    });

    test("configurePushToTalk switches to mouse mode", async () => {
        orchestrator = new DictationOrchestrator({
            helperBinaryPath,
            mouseButton: null,
            keyboardFallbackKeycode: null,
            keyboardAccelerator: null,
            sampleRate: 48_000,
            injectMode: "auto",
            overlayEnabled: false,
        });

        await orchestrator.initialize(() => {});
        const hotkeyMonitor = (orchestrator as any).hotkey;

        await orchestrator.configurePushToTalk({
            mouseButton: 5,
            keyboardAccelerator: null,
        });

        expect(hotkeyMonitor.setMouseButton).toHaveBeenCalledWith(5);
    });
});
```