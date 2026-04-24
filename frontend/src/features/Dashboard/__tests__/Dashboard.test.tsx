import { act, fireEvent, screen, waitFor } from "@testing-library/react";

import Dashboard from "../Dashboard";
import { renderWithStore } from "../../../testUtils";
import {
  mockDictationState,
  mockAudioDevicesState,
  mockRecordingState,
  mergeMockState,
} from "../../../testUtils/mockState";
import {
  dictationStartRequested,
  dictationStopRequested,
  dictationCancelRequested,
} from "../../../store/slices/dictation";
import { importRecordingsRequested } from "../../../store/slices/recording";
import "../../../i18n";

jest.mock("../../../api/dictationPush", () => ({
  pushDictationAudio: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-toastify", () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  ToastContainer: () => null,
}));

import { toast } from "react-toastify";

type DataHandler = (event: { data: Blob }) => void;

interface FakeMediaRecorderInstance {
  start: jest.Mock;
  stop: jest.Mock;
  ondataavailable: DataHandler | null;
}

let lastRecorder: FakeMediaRecorderInstance | null = null;

class FakeMediaRecorder {
  public start: jest.Mock = jest.fn();
  public stop: jest.Mock;
  public ondataavailable: DataHandler | null = null;
  private stopListeners: Array<() => void> = [];

  constructor(
    public stream: MediaStream,
    _opts?: unknown
  ) {
    this.stop = jest.fn(() => {
      const snapshot = this.stopListeners.slice();
      this.stopListeners.length = 0;
      for (const listener of snapshot) listener();
    });
    lastRecorder = this as unknown as FakeMediaRecorderInstance;
  }

  public addEventListener(type: string, listener: () => void): void {
    if (type === "stop") this.stopListeners.push(listener);
  }

  public removeEventListener(type: string, listener: () => void): void {
    if (type !== "stop") return;
    const idx = this.stopListeners.indexOf(listener);
    if (idx !== -1) this.stopListeners.splice(idx, 1);
  }
}

const installMediaMocks = () => {
  const getUserMedia = jest.fn(
    async () =>
      ({
        getTracks: () => [{ stop: jest.fn() }],
      }) as unknown as MediaStream
  );
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
    writable: true,
  });
  (globalThis as unknown as { MediaRecorder: typeof FakeMediaRecorder }).MediaRecorder =
    FakeMediaRecorder;
  return { getUserMedia };
};

const renderDashboard = (preloadedState: Parameters<typeof mergeMockState>[0] = {}) =>
  renderWithStore(<Dashboard />, { preloadedState });

describe("Dashboard — migrated to Redux actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastRecorder = null;
  });

  it("Dashboard_RenderRecordButton_Idle", async () => {
    renderDashboard(mockDictationState());
    expect(await screen.findByTestId("dashboard-record")).toBeInTheDocument();
  });

  it("Dashboard_ClickRecord_DispatchesDictationStart", async () => {
    const { getActions } = renderDashboard(mockDictationState());
    const btn = await screen.findByTestId("dashboard-record");
    act(() => {
      fireEvent.click(btn);
    });
    expect(getActions()).toContainEqual(
      dictationStartRequested({ source: "dashboard", persistOnStop: true })
    );
  });

  it("Dashboard_TranscriptDisplayed_OnStopped", async () => {
    const preloaded = mergeMockState(
      mockDictationState({
        status: { phase: "stopped", polishedText: "Hello world", persistOnStop: false },
      })
    );
    renderDashboard(preloaded);
    expect(await screen.findByTestId("dashboard-transcript")).toHaveTextContent("Hello world");
  });

  it("Dashboard_ErrorToast_OnFailed", () => {
    const preloaded = mergeMockState(
      mockDictationState({
        status: { phase: "failed", error: "something went wrong" },
      })
    );
    renderDashboard(preloaded);
    expect(toast.error).toHaveBeenCalledWith("something went wrong");
  });

  it("Dashboard_DeviceChangeToast_FiresOnNewChange", () => {
    const preloaded = mergeMockState(
      mockAudioDevicesState({
        lastChange: { id: 1, kind: "connected", defaultName: "AirPods Pro" },
      })
    );
    renderDashboard(preloaded);
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("AirPods Pro"));
  });

  it("Dashboard_PickViaDialog_NonElectron_InfoToast", async () => {
    const winAny = window as unknown as Record<string, unknown>;
    const original = winAny["mozgoslav"];
    winAny["mozgoslav"] = undefined;

    renderDashboard(mockDictationState());

    const addBtn = screen.getByRole("button", { name: /add|добавить/i });
    act(() => {
      fireEvent.click(addBtn);
    });

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Используй drag-and-drop"));

    winAny["mozgoslav"] = original;
  });

  it("Dashboard_UploadErrorToast", () => {
    const preloaded = mergeMockState(mockRecordingState({ lastUploadError: "upload failed" }));
    renderDashboard(preloaded);
    expect(toast.error).toHaveBeenCalledWith("upload failed");
  });

  it("Dashboard_GlobalHotkey_DispatchesDictationStart", () => {
    const { getActions } = renderDashboard(mockDictationState());

    act(() => {
      window.dispatchEvent(
        new CustomEvent("mozgoslav:global-hotkey-redispatch", {
          detail: { source: "global-hotkey" },
        })
      );
    });

    expect(getActions()).toContainEqual(
      dictationStartRequested({ source: "global-hotkey", persistOnStop: false })
    );
  });

  it("Dashboard_ActivePhase_SetsUpMediaRecorder", async () => {
    const { getUserMedia } = installMediaMocks();
    const preloaded = mergeMockState(
      mockDictationState({
        status: {
          phase: "active",
          sessionId: "sess-active",
          source: "dashboard",
          persistOnStop: true,
        },
      })
    );
    renderDashboard(preloaded);

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    await waitFor(() => expect(lastRecorder).not.toBeNull());
    expect(lastRecorder!.start).toHaveBeenCalledWith(250);
  });

  it("Dashboard_StopButton_DispatchesDictationStopRequested", async () => {
    installMediaMocks();
    const preloaded = mergeMockState(
      mockDictationState({
        status: {
          phase: "active",
          sessionId: "sess-stop",
          source: "dashboard",
          persistOnStop: true,
        },
      })
    );
    const { getActions } = renderDashboard(preloaded);

    await waitFor(() => expect(lastRecorder).not.toBeNull());

    act(() => {
      fireEvent.click(screen.getByTestId("dashboard-record"));
    });

    await waitFor(() => expect(getActions()).toContainEqual(dictationStopRequested()));
  });

  it("Dashboard_DropZone_NoPaths_ShowsInfoToast", async () => {
    const preloaded = mergeMockState(mockDictationState());
    renderDashboard(preloaded);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput) return;

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });
    Object.defineProperty(file, "path", { value: "", configurable: true });

    await act(async () => {
      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      });
      fireEvent.change(fileInput);
    });

    await waitFor(() => expect(toast.info).toHaveBeenCalled());
  });

  it("Dashboard_CancelClick_DuringActive_DispatchesCancelRequested", async () => {
    installMediaMocks();
    const preloaded = mergeMockState(
      mockDictationState({
        status: {
          phase: "active",
          sessionId: "s1",
          source: "dashboard",
          persistOnStop: true,
        },
      })
    );
    const { getActions } = renderDashboard(preloaded);

    await waitFor(() => expect(screen.getByTestId("dashboard-cancel")).toBeInTheDocument());

    act(() => {
      fireEvent.click(screen.getByTestId("dashboard-cancel"));
    });

    expect(getActions()).toContainEqual(dictationCancelRequested());
  });

  it("Dashboard_CancelButton_HiddenWhenIdle", () => {
    renderDashboard(mockDictationState());
    expect(screen.queryByTestId("dashboard-cancel")).not.toBeInTheDocument();
  });

  it("Dashboard_ImportRecordingsRequested_OnDialogPick", async () => {
    const mockOpenAudioFiles = jest.fn().mockResolvedValue({
      canceled: false,
      filePaths: ["/path/to/audio.mp3"],
    });
    (window as unknown as Record<string, unknown>)["mozgoslav"] = {
      openAudioFiles: mockOpenAudioFiles,
    };

    const { getActions } = renderDashboard(mockDictationState());

    const addBtn = screen.getByRole("button", { name: /add|добавить/i });
    act(() => {
      fireEvent.click(addBtn);
    });

    await waitFor(() =>
      expect(getActions()).toContainEqual(
        importRecordingsRequested({ filePaths: ["/path/to/audio.mp3"] })
      )
    );
  });
});
