import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { ToastContainer } from "react-toastify";

import Dashboard from "../Dashboard";
import { api } from "../../../api/MozgoslavApi";
import { lightTheme } from "../../../styles/theme";
import "../../../i18n";

jest.mock("../../../api/MozgoslavApi", () => ({
  api: {
    listRecordings: jest.fn().mockResolvedValue([]),
    uploadFiles: jest.fn(),
    importByPaths: jest.fn(),
    startDictation: jest.fn(),
    dictationPush: jest.fn(),
    stopDictation: jest.fn(),
  },
}));

// ------------------------------------------------------------ MediaRecorder mock
type DataHandler = (event: { data: Blob }) => void;

interface FakeMediaRecorderInstance {
  start: jest.Mock;
  stop: jest.Mock;
  ondataavailable: DataHandler | null;
  onstop: (() => void) | null;
}

let lastRecorder: FakeMediaRecorderInstance | null = null;

/* eslint-disable @typescript-eslint/no-this-alias */
class FakeMediaRecorder {
  public start: jest.Mock = jest.fn();
  public stop: jest.Mock;
  public ondataavailable: DataHandler | null = null;
  public onstop: (() => void) | null = null;

  constructor(public stream: MediaStream, _opts?: unknown) {
    const recorderInstance = this;
    this.stop = jest.fn(() => {
      recorderInstance.onstop?.();
    });
    lastRecorder = recorderInstance;
  }
}
/* eslint-enable @typescript-eslint/no-this-alias */

const installMocks = () => {
  const getUserMedia = jest.fn(async () => ({
    getTracks: () => [{ stop: jest.fn() }],
  } as unknown as MediaStream));
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
    writable: true,
  });
  (globalThis as unknown as { MediaRecorder: typeof FakeMediaRecorder }).MediaRecorder =
    FakeMediaRecorder;
  return { getUserMedia };
};

const renderDashboard = () =>
  render(
    <ThemeProvider theme={lightTheme}>
      <Dashboard />
      <ToastContainer />
    </ThemeProvider>,
  );

describe("Dashboard record button (BC-004 / Bug 3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastRecorder = null;
  });

  it("Dashboard_RecordButton_IdleToRecording", async () => {
    installMocks();
    (api.startDictation as jest.Mock).mockResolvedValue({ sessionId: "sess-1" });

    renderDashboard();
    const btn = await screen.findByTestId("dashboard-record");
    await userEvent.click(btn);

    await waitFor(() => expect(api.startDictation).toHaveBeenCalled());
    await waitFor(() => expect(lastRecorder).not.toBeNull());
    expect(lastRecorder!.start).toHaveBeenCalledWith(250);
    // Button now reads "stop".
    expect(await screen.findByText(/Остановить|Stop/)).toBeInTheDocument();
  });

  it("Dashboard_RecordButton_StopsAndRendersTranscript", async () => {
    installMocks();
    (api.startDictation as jest.Mock).mockResolvedValue({ sessionId: "sess-2" });
    (api.stopDictation as jest.Mock).mockResolvedValue({
      transcript: "Hello world",
    });

    renderDashboard();
    const btn = await screen.findByTestId("dashboard-record");
    await userEvent.click(btn);
    await waitFor(() => expect(lastRecorder).not.toBeNull());

    // Push a chunk to prove the pipe works. jsdom's Blob lacks arrayBuffer()
    // so we stub it inline.
    const buf = new ArrayBuffer(4);
    const fakeBlob = {
      size: 4,
      type: "audio/webm",
      arrayBuffer: async () => buf,
    } as unknown as Blob;
    act(() => {
      lastRecorder!.ondataavailable?.({ data: fakeBlob });
    });

    // Click Stop
    await userEvent.click(screen.getByTestId("dashboard-record"));
    await waitFor(() => expect(api.stopDictation).toHaveBeenCalledWith("sess-2"));
    expect(await screen.findByText("Hello world")).toBeInTheDocument();
  });

  it("Dashboard_RecordButton_PermissionDenied_ShowsError", async () => {
    const { getUserMedia } = installMocks();
    getUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"));
    (api.startDictation as jest.Mock).mockResolvedValue({ sessionId: "sess-3" });

    renderDashboard();
    await userEvent.click(await screen.findByTestId("dashboard-record"));

    // Error toast surfaces; button returns to Record state.
    await waitFor(() =>
      expect(screen.getByText(/NotAllowedError/)).toBeInTheDocument(),
    );
  });

  // Global hotkey fires the same recording pipeline as
  // the mouse-5 entry. `window.mozgoslav.onGlobalHotkey` is the preload bridge
  // the renderer subscribes to; firing it must kick the dictation lifecycle
  // off with `source: "global-hotkey"`.
  it("Dashboard_GlobalHotkey_StartsDictation", async () => {
    installMocks();
    (api.startDictation as jest.Mock).mockResolvedValue({ sessionId: "sess-hotkey" });

    let firedCallback: ((payload: { source: string }) => void) | null = null;
    const unsubscribe = jest.fn();
    (globalThis as unknown as { window: Window }).window.mozgoslav = {
      version: "test",
      openAudioFiles: jest.fn(),
      openFolder: jest.fn(),
      openPath: jest.fn(),
      openModelFile: jest.fn(),
      openModelFolder: jest.fn(),
      listSyncConflicts: jest.fn(),
      onGlobalHotkey: (cb: (payload: { source: string }) => void) => {
        firedCallback = cb;
        return unsubscribe;
      },
    } as unknown as Window["mozgoslav"];

    try {
      renderDashboard();
      await waitFor(() => expect(firedCallback).not.toBeNull());

      act(() => {
        firedCallback!({ source: "global-hotkey" });
      });

      await waitFor(() =>
        expect(api.startDictation).toHaveBeenCalledWith({ source: "global-hotkey" }),
      );
    } finally {
      delete (window as unknown as { mozgoslav?: unknown }).mozgoslav;
    }
  });
});
