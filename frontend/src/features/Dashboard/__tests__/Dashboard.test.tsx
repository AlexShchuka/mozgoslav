import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { ToastContainer } from "react-toastify";

import Dashboard from "../Dashboard";
import { lightTheme } from "../../../styles/theme";
import "../../../i18n";

type SubscriptionSink<T> = {
  next: (value: { data: T }) => void;
  error: (err: unknown) => void;
  complete: () => void;
};

let audioDeviceSink: SubscriptionSink<unknown> | null = null;
// eslint-disable-next-line no-var -- jest.mock factories run before `let` is initialised; `var` keeps hoisting semantics
var mockRequest: jest.Mock;

jest.mock("../../../api/graphqlClient", () => {
  mockRequest = jest.fn();
  return {
    graphqlClient: { request: mockRequest },
    getGraphqlWsClient: jest.fn(() => ({
      subscribe: jest.fn((query: { query: string }, sink: SubscriptionSink<unknown>) => {
        if (query.query && query.query.includes("audioDeviceChanged")) {
          audioDeviceSink = sink;
        }
        return () => {};
      }),
      dispose: jest.fn(),
    })),
  };
});

jest.mock("../../../api/dictationPush", () => ({
  pushDictationAudio: jest.fn().mockResolvedValue(undefined),
}));

import { pushDictationAudio } from "../../../api/dictationPush";

const dictationPushMock = pushDictationAudio as jest.Mock;

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
  private stopListeners: Array<() => void> = [];

  constructor(
    public stream: MediaStream,
    _opts?: unknown
  ) {
    const recorderInstance = this;
    this.stop = jest.fn(() => {
      recorderInstance.onstop?.();
      const snapshot = recorderInstance.stopListeners.slice();
      recorderInstance.stopListeners.length = 0;
      for (const listener of snapshot) listener();
    });
    lastRecorder = recorderInstance;
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

/* eslint-enable @typescript-eslint/no-this-alias */

const installMocks = () => {
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

const renderDashboard = () =>
  render(
    <ThemeProvider theme={lightTheme}>
      <Dashboard />
      <ToastContainer />
    </ThemeProvider>
  );

describe("Dashboard record button (BC-004 / Bug 3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastRecorder = null;
    audioDeviceSink = null;
    mockRequest.mockResolvedValue({});
  });

  it("Dashboard_RecordButton_IdleToRecording", async () => {
    installMocks();
    mockRequest.mockResolvedValueOnce({
      dictationStart: { sessionId: "sess-1", errors: [] },
    });

    renderDashboard();
    const btn = await screen.findByTestId("dashboard-record");
    await userEvent.click(btn);

    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    await waitFor(() => expect(lastRecorder).not.toBeNull());
    expect(lastRecorder!.start).toHaveBeenCalledWith(250);
    expect(await screen.findByText(/Остановить|Stop/)).toBeInTheDocument();
  });

  it("Dashboard_RecordButton_StopsAndRendersTranscript", async () => {
    installMocks();
    mockRequest
      .mockResolvedValueOnce({ dictationStart: { sessionId: "sess-2", errors: [] } })
      .mockResolvedValueOnce({
        dictationStop: {
          rawText: "Hello world",
          polishedText: "Hello world",
          durationMs: 1000,
          errors: [],
        },
      });

    renderDashboard();
    const btn = await screen.findByTestId("dashboard-record");
    await userEvent.click(btn);
    await waitFor(() => expect(lastRecorder).not.toBeNull());

    const buf = new ArrayBuffer(4);
    const fakeBlob = {
      size: 4,
      type: "audio/webm",
      arrayBuffer: async () => buf,
    } as unknown as Blob;
    act(() => {
      lastRecorder!.ondataavailable?.({ data: fakeBlob });
    });

    await userEvent.click(screen.getByTestId("dashboard-record"));
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ sessionId: "sess-2" })
      )
    );
    expect(await screen.findByText("Hello world")).toBeInTheDocument();
  });

  it("Dashboard_RecordButton_PermissionDenied_ShowsError", async () => {
    const { getUserMedia } = installMocks();
    getUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"));
    mockRequest.mockResolvedValueOnce({ dictationStart: { sessionId: "sess-3", errors: [] } });

    renderDashboard();
    await userEvent.click(await screen.findByTestId("dashboard-record"));

    await waitFor(() => expect(screen.getByText(/NotAllowedError/)).toBeInTheDocument());
  });

  it("Dashboard_DeviceChangedGql_ShowsToastOnHotPlug", async () => {
    installMocks();

    renderDashboard();

    await waitFor(() => expect(audioDeviceSink).not.toBeNull());

    act(() => {
      audioDeviceSink!.next({
        data: {
          audioDeviceChanged: {
            kind: "connected",
            devices: [{ id: "id-1", name: "AirPods Pro", isDefault: true }],
            observedAt: new Date().toISOString(),
          },
        },
      });
    });

    await waitFor(() => expect(screen.getByText(/AirPods Pro/)).toBeInTheDocument());
  });

  it("Dashboard_GlobalHotkey_StartsDictation", async () => {
    installMocks();
    mockRequest.mockResolvedValueOnce({
      dictationStart: { sessionId: "sess-hotkey", errors: [] },
    });

    renderDashboard();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("mozgoslav:global-hotkey-redispatch", {
          detail: { source: "global-hotkey" },
        })
      );
    });

    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ source: "global-hotkey" })
      )
    );
  });

  it("Dashboard_Push_UsesPushDictationAudio", async () => {
    installMocks();
    mockRequest.mockResolvedValueOnce({ dictationStart: { sessionId: "sess-push", errors: [] } });

    renderDashboard();
    await userEvent.click(await screen.findByTestId("dashboard-record"));
    await waitFor(() => expect(lastRecorder).not.toBeNull());

    const buf = new ArrayBuffer(4);
    const fakeBlob = {
      size: 4,
      type: "audio/webm",
      arrayBuffer: async () => buf,
    } as unknown as Blob;

    await act(async () => {
      lastRecorder!.ondataavailable?.({ data: fakeBlob });
      await Promise.resolve();
    });

    await waitFor(() => expect(dictationPushMock).toHaveBeenCalledWith("sess-push", buf));
  });
});
