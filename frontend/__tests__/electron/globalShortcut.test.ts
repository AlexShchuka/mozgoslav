import {EventEmitter} from "node:events";
import {
    GLOBAL_HOTKEY_ACCELERATOR,
    GLOBAL_HOTKEY_IPC_CHANNEL,
    registerGlobalDictationHotkey,
    unregisterGlobalDictationHotkey,
} from "../../electron/dictation/globalHotkey";

const registerMock = jest.fn();
const unregisterAllMock = jest.fn();
const sendMock = jest.fn();

jest.mock(
    "electron",
    () => {
        const app = new EventEmitter() as EventEmitter & {
            whenReady: jest.Mock;
            on: EventEmitter["on"];
        };
        app.whenReady = jest.fn().mockResolvedValue(undefined);
        return {
            app,
            globalShortcut: {
                register: registerMock,
                unregisterAll: unregisterAllMock,
                isRegistered: jest.fn().mockReturnValue(false),
            },
            BrowserWindow: {
                getAllWindows: jest.fn().mockReturnValue([
                    {
                        isDestroyed: () => false,
                        webContents: {send: sendMock},
                    },
                ]),
            },
        };
    },
    {virtual: true},
);

describe("globalHotkey — electron main process (TODO-1)", () => {
    beforeEach(() => {
        registerMock.mockReset();
        unregisterAllMock.mockReset();
        sendMock.mockReset();
    });

    it("Register_OnReady_BindsCmdShiftSpace", () => {
        registerGlobalDictationHotkey();

        expect(registerMock).toHaveBeenCalledTimes(1);
        expect(registerMock).toHaveBeenCalledWith(
            GLOBAL_HOTKEY_ACCELERATOR,
            expect.any(Function),
        );
        expect(GLOBAL_HOTKEY_ACCELERATOR).toBe("CommandOrControl+Shift+Space");
    });

    it("Unregister_OnQuit_ReleasesAll", () => {
        unregisterGlobalDictationHotkey();
        expect(unregisterAllMock).toHaveBeenCalledTimes(1);
    });

    it("Toggle_EmitsIpcToRenderer", () => {
        registerGlobalDictationHotkey();
        const callback = registerMock.mock.calls[0]?.[1] as () => void;
        expect(callback).toBeDefined();

        callback();

        expect(sendMock).toHaveBeenCalledWith(GLOBAL_HOTKEY_IPC_CHANNEL, {
            source: "global-hotkey",
        });
    });

    it("task #10 — registers a custom accelerator when provided", () => {
        registerGlobalDictationHotkey("CommandOrControl+Alt+M");

        expect(registerMock).toHaveBeenCalledWith(
            "CommandOrControl+Alt+M",
            expect.any(Function),
        );
    });

    it("task #10 — empty/whitespace accelerator falls back to the default", () => {
        registerGlobalDictationHotkey("   ");

        expect(registerMock).toHaveBeenCalledWith(
            GLOBAL_HOTKEY_ACCELERATOR,
            expect.any(Function),
        );
    });
});
