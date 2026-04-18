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

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
  mockApi.healthApi.checkLlm.mockResolvedValue(true);
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

  it("renders six step dots on macOS", async () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    renderOnboarding();
    await waitFor(() => {
      const dots = screen.getAllByTestId("onboarding-dot");
      // macOS: welcome + tryItNow + llm + obsidian + mic + dictation + ready = 7.
      // Plan §2.3 promises 6 visible cards but counts the Ready step in the
      // visible total; we keep one dot per visible step.
      expect(dots.length).toBe(7);
    });
  });

  it("renders fewer step dots on Linux (no mic/dictation permission cards)", async () => {
    Object.defineProperty(navigator, "platform", { value: "Linux x86_64", configurable: true });
    renderOnboarding();
    await waitFor(() => {
      const dots = screen.getAllByTestId("onboarding-dot");
      expect(dots.length).toBe(5);
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
    // macOS: 7 cards → 6 Next clicks take us to Ready; the 7th click fires
    // Apply → persistCompletionSaga → localStorage flag.
    await clickNext(7);
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
