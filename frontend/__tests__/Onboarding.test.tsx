import { screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Onboarding from "../src/features/Onboarding";
import { watchOnboardingSagas } from "../src/store/slices/onboarding";
import { renderWithStore, type MockApiBundle } from "../src/testUtils";
import { darkTheme } from "../src/styles/theme";
import "../src/i18n";

jest.mock("../src/api", () => {
  const actual = jest.requireActual("../src/api");
  const {
    createMockApi,
  } = jest.requireActual("../src/testUtils/mockApi") as typeof import("../src/testUtils/mockApi");
  const bundle = createMockApi();
  return {
    ...actual,
    apiFactory: bundle.factory,
    __bundle: bundle,
  };
});

const mockApi = (
  jest.requireMock("../src/api") as { __bundle: MockApiBundle }
).__bundle;

const renderOnboarding = () =>
  renderWithStore(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
    { sagas: [watchOnboardingSagas], theme: darkTheme },
  );

const clickNext = async (times: number): Promise<void> => {
  for (let i = 0; i < times; i++) {
    await waitFor(() =>
      expect(screen.getByTestId("onboarding-next")).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByTestId("onboarding-next"));
  }
};

// jsdom has no EventSource — stub just enough for ModelDownloadProgress to mount.
class StubEventSource {
  public onmessage: ((ev: MessageEvent) => void) | null = null;
  public onerror: ((ev: Event) => void) | null = null;
  public addEventListener(): void {}
  public removeEventListener(): void {}
  public close(): void {}
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).EventSource = StubEventSource;
  mockApi.healthApi.checkLlm.mockResolvedValue(true);
  // Default to an empty catalogue so tests that don't care about the models
  // step (Next is not blocked when there are no required Tier 1 items).
  mockApi.modelsApi.list.mockResolvedValue([]);
  mockApi.dictationApi.audioCapabilities.mockResolvedValue({
    isSupported: true,
    detectedPlatform: "macos",
    permissionsRequired: ["microphone"],
  });
  mockApi.obsidianApi.detect.mockResolvedValue({ detected: [], searched: [] });
});

describe("Onboarding — plan v0.8 Block 4 (slim, platform-aware)", () => {
  it("renders welcome step first (brand animation)", () => {
    renderOnboarding();
    expect(screen.getByTestId("onboarding-brand")).toBeInTheDocument();
  });

  it("renders eight step dots on macOS (task #12b adds models step)", async () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    renderOnboarding();
    await waitFor(() => {
      const dots = screen.getAllByTestId("onboarding-dot");
      // macOS: welcome + tryItNow + models + llm + obsidian + mic + dictation + ready = 8.
      expect(dots.length).toBe(8);
    });
  });

  it("renders fewer step dots on Linux (no mic/dictation permission cards)", async () => {
    Object.defineProperty(navigator, "platform", { value: "Linux x86_64", configurable: true });
    renderOnboarding();
    await waitFor(() => {
      const dots = screen.getAllByTestId("onboarding-dot");
      // Linux: welcome + tryItNow + models + llm + obsidian + ready = 6.
      expect(dots.length).toBe(6);
    });
  });

  it("Next is always enabled (every step is skippable via Next per plan §5)", async () => {
    renderOnboarding();
    await waitFor(() =>
      expect(screen.getByTestId("onboarding-next")).not.toBeDisabled(),
    );
  });

  it("writes onboardingComplete flag when user reaches the Ready step and clicks Apply", async () => {
    renderOnboarding();
    // macOS: 8 cards (welcome, tryItNow, models, llm, obsidian, mic, dictation,
    // ready) → 7 Next clicks take us to Ready; the 8th click fires Apply →
    // persistCompletionSaga → localStorage flag.
    await clickNext(8);
    await waitFor(() =>
      expect(window.localStorage.getItem("mozgoslav.onboardingComplete")).toBe("true"),
    );
  });

  it("task #12b — models step lists Tier 1 bundle models with installed/missing status", async () => {
    mockApi.modelsApi.list.mockResolvedValue([
      {
        id: "whisper-small-russian-bundle",
        name: "Whisper Small",
        description: "Bundled STT",
        url: "https://example/whisper-small.bin",
        sizeMb: 260,
        kind: "Stt",
        tier: "bundle",
        isDefault: false,
        destinationPath: "/models/ggml-small-q8_0.bin",
        installed: false,
      },
      {
        id: "silero-vad",
        name: "Silero VAD v6.2.0",
        description: "Bundled VAD",
        url: "https://example/silero.bin",
        sizeMb: 4,
        kind: "Vad",
        tier: "bundle",
        isDefault: true,
        destinationPath: "/models/ggml-silero-v6.2.0.bin",
        installed: true,
      },
      {
        id: "whisper-large-v3-russian-antony66",
        name: "Antony66 RU",
        description: "Tier 2 not shown on onboarding",
        url: "https://example/antony66.bin",
        sizeMb: 1500,
        kind: "Stt",
        tier: "downloadable",
        isDefault: true,
        destinationPath: "/models/antony66.bin",
        installed: false,
      },
    ]);

    renderOnboarding();

    // welcome → tryItNow → models (2 Next clicks).
    await clickNext(2);

    await waitFor(() =>
      expect(screen.getByTestId("onboarding-models-item-whisper-small-russian-bundle"))
        .toBeInTheDocument(),
    );

    // Silero (bundled + installed) shows up.
    expect(screen.getByTestId("onboarding-models-item-silero-vad")).toBeInTheDocument();

    // Tier 2 antony66 is not listed on onboarding — it's a Settings → Models concern.
    expect(
      screen.queryByTestId("onboarding-models-item-whisper-large-v3-russian-antony66"),
    ).toBeNull();

    // Missing model shows "Скачать всё" CTA inside the card.
    expect(screen.getByTestId("onboarding-models-download-all")).toBeInTheDocument();
    // Toolbar Next stays disabled until everything is installed.
    expect(screen.getByTestId("onboarding-next")).toBeDisabled();
  });

  it("task #12b — Next is enabled on models step only when every Tier 1 model is installed", async () => {
    mockApi.modelsApi.list.mockResolvedValue([
      {
        id: "whisper-small-russian-bundle",
        name: "Whisper Small",
        description: "Bundled STT",
        url: "https://example/whisper-small.bin",
        sizeMb: 260,
        kind: "Stt",
        tier: "bundle",
        isDefault: false,
        destinationPath: "/models/ggml-small-q8_0.bin",
        installed: true,
      },
      {
        id: "silero-vad",
        name: "Silero VAD",
        description: "Bundled VAD",
        url: "https://example/silero.bin",
        sizeMb: 4,
        kind: "Vad",
        tier: "bundle",
        isDefault: true,
        destinationPath: "/models/ggml-silero-v6.2.0.bin",
        installed: true,
      },
    ]);

    renderOnboarding();
    await clickNext(2);

    await waitFor(() =>
      expect(screen.getByTestId("onboarding-next")).not.toBeDisabled(),
    );
    // No outstanding downloads → the in-card "Скачать всё" button is gone.
    expect(screen.queryByTestId("onboarding-models-download-all")).toBeNull();
  });

  it("task #12b — Скачать всё triggers modelsApi.download for every missing Tier 1 model", async () => {
    mockApi.modelsApi.list.mockResolvedValue([
      {
        id: "whisper-small-russian-bundle",
        name: "Whisper Small",
        description: "Bundled STT",
        url: "u1",
        sizeMb: 260,
        kind: "Stt",
        tier: "bundle",
        isDefault: false,
        destinationPath: "/models/ggml-small-q8_0.bin",
        installed: false,
      },
      {
        id: "silero-vad",
        name: "Silero VAD",
        description: "Bundled VAD",
        url: "u2",
        sizeMb: 4,
        kind: "Vad",
        tier: "bundle",
        isDefault: true,
        destinationPath: "/models/ggml-silero-v6.2.0.bin",
        installed: false,
      },
    ]);
    mockApi.modelsApi.download.mockResolvedValue({ downloadId: "dl-1" });

    renderOnboarding();
    await clickNext(2);

    await waitFor(() =>
      expect(screen.getByTestId("onboarding-models-download-all")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("onboarding-models-download-all"));

    await waitFor(() =>
      expect(mockApi.modelsApi.download).toHaveBeenCalledWith("whisper-small-russian-bundle"),
    );
  });

  it("Skip button marks onboarding as complete (task #14)", async () => {
    renderOnboarding();
    // welcome → tryItNow → models → llm (first skippable step). With an empty
    // models catalogue, Next on the models step isn't blocked.
    await clickNext(3);
    await waitFor(() =>
      expect(screen.getByTestId("onboarding-skip")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("onboarding-skip"));

    await waitFor(() =>
      expect(window.localStorage.getItem("mozgoslav.onboardingComplete")).toBe("true"),
    );
  });

  it("U1 — try-sample button uploads the bundled WAV via recordingApi.upload", async () => {
    // Stub fetch("/sample.wav") so the test doesn't need Vite or a Response shim.
    const wavBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
    const blob = new Blob([wavBytes], { type: "audio/wav" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalFetch = (global as any).fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = fetchMock;
    mockApi.recordingApi.upload.mockResolvedValue([]);

    try {
      renderOnboarding();
      // Welcome → tryItNow takes one Next click.
      await clickNext(1);

      await waitFor(() =>
        expect(screen.getByTestId("onboarding-try-sample")).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByTestId("onboarding-try-sample"));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/sample.wav"));
      await waitFor(() =>
        expect(mockApi.recordingApi.upload).toHaveBeenCalledTimes(1),
      );
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).fetch = originalFetch;
    }
  });
});
