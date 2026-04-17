import { EventEmitter } from "node:events";

// Mock electron before the module under test is imported. The global hotkey
// helper module depends only on the contract below — no `import.meta`, no real
// BrowserWindow needed.
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
            webContents: { send: sendMock },
          },
        ]),
      },
    };
  },
  { virtual: true },
);

import {
  GLOBAL_HOTKEY_ACCELERATOR,
  GLOBAL_HOTKEY_IPC_CHANNEL,
  registerGlobalDictationHotkey,
  unregisterGlobalDictationHotkey,
} from "../../electron/dictation/globalHotkey";

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
    // Pull out the callback registered with globalShortcut.register and fire it
    // as Electron would when the user presses the accelerator.
    const callback = registerMock.mock.calls[0]?.[1] as () => void;
    expect(callback).toBeDefined();

    callback();

    expect(sendMock).toHaveBeenCalledWith(GLOBAL_HOTKEY_IPC_CHANNEL, {
      source: "global-hotkey",
    });
  });
});
