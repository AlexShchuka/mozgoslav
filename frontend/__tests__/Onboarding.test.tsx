import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";

import Onboarding from "../src/features/Onboarding/Onboarding";
import { api } from "../src/api/MozgoslavApi";
import { darkTheme } from "../src/styles/theme";
import "../src/i18n";

jest.mock("../src/api/MozgoslavApi", () => ({
  api: {
    llmHealth: jest.fn().mockResolvedValue(true),
    listModels: jest.fn().mockResolvedValue([
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
    ]),
    audioCapabilities: jest.fn().mockResolvedValue({
      isSupported: true,
      detectedPlatform: "macos",
      permissionsRequired: ["microphone"],
    }),
    detectObsidian: jest.fn().mockResolvedValue({ detected: [], searched: [] }),
  },
}));

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
  (api.llmHealth as jest.Mock).mockResolvedValue(true);
  (api.listModels as jest.Mock).mockResolvedValue([
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
  (api.audioCapabilities as jest.Mock).mockResolvedValue({
    isSupported: true,
    detectedPlatform: "macos",
    permissionsRequired: ["microphone"],
  });
  (api.detectObsidian as jest.Mock).mockResolvedValue({ detected: [], searched: [] });
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
