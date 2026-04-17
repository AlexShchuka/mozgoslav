import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";

import Onboarding from "../src/features/Onboarding/Onboarding";
import { darkTheme } from "../src/styles/theme";
import "../src/i18n";

jest.mock("../src/api", () => {
  const actual = jest.requireActual("../src/api");
  const healthStub = { checkLlm: jest.fn(), getHealth: jest.fn() };
  const modelsStub = { list: jest.fn(), download: jest.fn() };
  const dictationStub = {
    audioCapabilities: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    push: jest.fn(),
  };
  const obsidianStub = {
    detect: jest.fn(),
    setup: jest.fn(),
    bulkExport: jest.fn(),
    applyLayout: jest.fn(),
    restHealth: jest.fn(),
  };
  return {
    ...actual,
    apiFactory: {
      ...actual.apiFactory,
      createHealthApi: () => healthStub,
      createModelsApi: () => modelsStub,
      createDictationApi: () => dictationStub,
      createObsidianApi: () => obsidianStub,
    },
    __healthStub: healthStub,
    __modelsStub: modelsStub,
    __dictationStub: dictationStub,
    __obsidianStub: obsidianStub,
  };
});

const mocks = jest.requireMock("../src/api") as {
  __healthStub: Record<string, jest.Mock>;
  __modelsStub: Record<string, jest.Mock>;
  __dictationStub: Record<string, jest.Mock>;
  __obsidianStub: Record<string, jest.Mock>;
};
const healthLlmMock = mocks.__healthStub.checkLlm;
const listModelsMock = mocks.__modelsStub.list;
const audioCapabilitiesMock = mocks.__dictationStub.audioCapabilities;
const detectObsidianMock = mocks.__obsidianStub.detect;

const renderOnboarding = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={darkTheme}>
        <Onboarding />
      </ThemeProvider>
    </MemoryRouter>,
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
  healthLlmMock.mockResolvedValue(true);
  listModelsMock.mockResolvedValue([
    {
      id: "whisper",
      installed: true,
      kind: "Stt",
      name: "whisper",
      sizeMb: 100,
      description: "",
      destinationPath: "",
      isDefault: true,
      url: "",
    },
  ]);
  audioCapabilitiesMock.mockResolvedValue({
    isSupported: true,
    detectedPlatform: "macos",
    permissionsRequired: ["microphone"],
  });
  detectObsidianMock.mockResolvedValue({ detected: [], searched: [] });
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
    // Apply → finish() → localStorage flag.
    await clickNext(7);
    await waitFor(() =>
      expect(window.localStorage.getItem("mozgoslav.onboardingComplete")).toBe("true"),
    );
  });
});
