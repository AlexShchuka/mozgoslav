import {EventEmitter} from "node:events";

jest.mock(
    "electron",
    () => {
        const {EventEmitter: EE} = require("node:events");
        return {
            net: {
                request: jest.fn((init: {method: string; url: string}) => {
                    const req = new EE();
                    req.setHeader = jest.fn();
                    req.write = jest.fn();
                    req.end = jest.fn(() => {
                        setTimeout(() => {
                            const response = new EE();
                            req.emit("response", response);
                            setTimeout(() => {
                                if (init.url.includes("/api/dictation/stream/")) {
                                    return;
                                }
                                let body = "{}";
                                if (init.url.includes("/api/dictation/start")) {
                                    body = JSON.stringify({sessionId: "test-session-id"});
                                } else if (init.url.includes("/api/dictation/stop/")) {
                                    body = JSON.stringify({
                                        rawText: "hi",
                                        polishedText: "Hi.",
                                        durationMs: 100,
                                    });
                                }
                                response.emit("data", Buffer.from(body));
                                response.emit("end");
                            });
                        });
                    });
                    return req;
                }),
            },
        };
    },
    {virtual: true},
);

jest.mock("../../electron/dictation/NativeHelperClient", () => {
    const {EventEmitter: EE} = require("node:events");
    return {
        NativeHelperClient: jest.fn().mockImplementation(function (this: EventEmitter) {
            const ee = new EE();
            Object.setPrototypeOf(this, ee);
            (this as unknown as Record<string, unknown>).start = jest.fn();
            (this as unknown as Record<string, unknown>).stop = jest.fn();
            (this as unknown as Record<string, unknown>).captureStart = jest.fn().mockResolvedValue(undefined);
            (this as unknown as Record<string, unknown>).captureStop = jest.fn().mockResolvedValue(undefined);
            (this as unknown as Record<string, unknown>).injectText = jest.fn().mockResolvedValue(undefined);
            (this as unknown as Record<string, unknown>).startHotkey = jest.fn().mockResolvedValue(undefined);
            (this as unknown as Record<string, unknown>).stopHotkey = jest.fn().mockResolvedValue(undefined);
            (this as unknown as Record<string, unknown>).detectTarget = jest.fn().mockResolvedValue({
                bundleId: "", appName: "", useAX: false,
            });
        }),
    };
});

jest.mock("../../electron/dictation/HotkeyMonitor", () => {
    const {EventEmitter: EE} = require("node:events");
    return {
        HotkeyMonitor: jest.fn().mockImplementation(function (this: EventEmitter) {
            const ee = new EE();
            Object.setPrototypeOf(this, ee);
            (this as unknown as Record<string, unknown>).start = jest.fn().mockResolvedValue(undefined);
            (this as unknown as Record<string, unknown>).stop = jest.fn();
            (this as unknown as Record<string, unknown>).setMouseButton = jest.fn();
        }),
    };
});

jest.mock("../../electron/dictation/OverlayWindow", () => ({
    OverlayWindow: jest.fn().mockImplementation(() => ({
        show: jest.fn(),
        updateState: jest.fn(),
        scheduleHide: jest.fn(),
        destroy: jest.fn(),
    })),
}));

jest.mock("../../electron/dictation/TrayManager", () => ({
    TrayManager: jest.fn().mockImplementation(() => ({
        build: jest.fn(),
        setPhase: jest.fn(),
        destroy: jest.fn(),
    })),
}));

jest.mock("../../electron/dictation/PhaseSoundPlayer", () => ({
    PhaseSoundPlayer: jest.fn().mockImplementation(() => ({
        handleTransition: jest.fn(),
    })),
}));

import {
    DictationOrchestrator,
    type OrchestratorOptions,
} from "../../electron/dictation/DictationOrchestrator";

interface HelperMock extends EventEmitter {
    captureStart: jest.Mock;
    captureStop: jest.Mock;
    injectText: jest.Mock;
    startHotkey: jest.Mock;
    stopHotkey: jest.Mock;
}

interface HotkeyMock {
    start: jest.Mock;
    stop: jest.Mock;
    setMouseButton: jest.Mock;
}

const flush = async (): Promise<void> => {
    for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r));
    }
};

const makeOptions = (overrides: Partial<OrchestratorOptions> = {}): OrchestratorOptions => ({
    helperBinaryPath: "/fake/helper",
    mouseButton: null,
    keyboardFallbackKeycode: null,
    keyboardAccelerator: null,
    sampleRate: 16_000,
    injectMode: "auto",
    overlayEnabled: false,
    ...overrides,
});

const getHelper = (orch: DictationOrchestrator): HelperMock =>
    (orch as unknown as {helper: HelperMock}).helper;

const getHotkey = (orch: DictationOrchestrator): HotkeyMock =>
    (orch as unknown as {hotkey: HotkeyMock}).hotkey;

describe("DictationOrchestrator keyboard push-to-talk wiring", () => {
    it("helper 'hotkey' press triggers handlePress → captureStart", async () => {
        const orch = new DictationOrchestrator(makeOptions({mouseButton: 5}));
        await orch.initialize(() => {});

        const helper = getHelper(orch);
        helper.emit("hotkey", {kind: "press", accelerator: "x", observedAt: "2026-01-01"});

        await flush();

        expect(helper.captureStart).toHaveBeenCalledWith(16_000);
    });

    it("helper 'hotkey' release triggers handleRelease → captureStop + injectText", async () => {
        const orch = new DictationOrchestrator(makeOptions({mouseButton: 5}));
        await orch.initialize(() => {});

        const helper = getHelper(orch);

        helper.emit("hotkey", {kind: "press", accelerator: "x", observedAt: "2026-01-01"});
        await flush();
        expect(helper.captureStart).toHaveBeenCalled();

        helper.emit("hotkey", {kind: "release", accelerator: "x", observedAt: "2026-01-01"});
        await flush();

        expect(helper.captureStop).toHaveBeenCalled();
        expect(helper.injectText).toHaveBeenCalledWith("Hi.", "auto");
    });

    it("configurePushToTalk({mouseButton: 5, keyboardAccelerator: null}) arms mouse, silences keyboard", async () => {
        const orch = new DictationOrchestrator(makeOptions());
        await orch.initialize(() => {});

        const hotkey = getHotkey(orch);
        const helper = getHelper(orch);
        hotkey.start.mockClear();
        helper.stopHotkey.mockClear();

        await orch.configurePushToTalk({mouseButton: 5, keyboardAccelerator: null});

        expect(hotkey.setMouseButton).toHaveBeenCalledWith(5);
        expect(hotkey.start).toHaveBeenCalled();
        expect(helper.stopHotkey).toHaveBeenCalled();
    });

    it("configurePushToTalk({mouseButton: null, keyboardAccelerator: 'CommandOrControl+7'}) silences mouse, arms keyboard", async () => {
        const orch = new DictationOrchestrator(makeOptions());
        await orch.initialize(() => {});

        const hotkey = getHotkey(orch);
        const helper = getHelper(orch);
        hotkey.stop.mockClear();
        helper.startHotkey.mockClear();

        await orch.configurePushToTalk({
            mouseButton: null,
            keyboardAccelerator: "CommandOrControl+7",
        });

        expect(hotkey.setMouseButton).toHaveBeenCalledWith(null);
        expect(hotkey.stop).toHaveBeenCalled();
        expect(helper.startHotkey).toHaveBeenCalledWith("CommandOrControl+7");
    });
});
