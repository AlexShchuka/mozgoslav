import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
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
      { id: "whisper", installed: true, kind: "Stt", name: "whisper", sizeMb: 100, description: "", destinationPath: "", isDefault: true, url: "" },
    ]),
  },
}));

const renderOnboarding = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={darkTheme}>
        <Onboarding />
      </ThemeProvider>
    </MemoryRouter>
  );

const clickNext = async (times: number): Promise<void> => {
  for (let i = 0; i < times; i++) {
    await waitFor(() =>
      expect(screen.getByTestId("onboarding-next")).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByTestId("onboarding-next"));
  }
};

// 9-step wizard per ADR-007 D15:
//   0 welcome → 1 models → 2 obsidian → 3 llm → 4 syncthing
//   → 5 mic (perm) → 6 accessibility (perm) → 7 input-monitoring (perm) → 8 ready
describe("Onboarding — 9-step wizard (ADR-007 D15)", () => {
  it("renders nine step dots", () => {
    renderOnboarding();
    const dots = screen.getAllByTestId("onboarding-dot");
    expect(dots.length).toBe(9);
  });

  it("renders welcome step first", () => {
    renderOnboarding();
    expect(screen.getByTestId("onboarding-brand")).toBeInTheDocument();
  });

  it("reaches microphone-access step after five clicks (welcome→models→obs→llm→sync→mic)", async () => {
    renderOnboarding();
    await clickNext(5);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-open-prefs-mic")).toBeInTheDocument();
    });
  });

  it("reaches accessibility step after six clicks", async () => {
    renderOnboarding();
    await clickNext(6);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-open-prefs-ax")).toBeInTheDocument();
    });
  });

  it("reaches input-monitoring step after seven clicks", async () => {
    renderOnboarding();
    await clickNext(7);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-open-prefs-input")).toBeInTheDocument();
    });
  });

  it("drops the permissions button on the final step", async () => {
    renderOnboarding();
    await clickNext(8);
    // framer-motion's exit animation lingers for ~180 ms; allow a generous
    // 3-second window for the previous permission step to finish unmounting.
    await waitFor(
      () => {
        expect(screen.queryAllByTestId(/onboarding-open-prefs/)).toHaveLength(0);
      },
      { timeout: 3000 },
    );
  });

  it("opens system preferences when the user clicks the button", async () => {
    const openSpy = jest.fn();
    const originalOpen = window.open;
    window.open = openSpy as unknown as typeof window.open;

    try {
      renderOnboarding();
      await clickNext(5);
      const prefsButton = await screen.findByTestId("onboarding-open-prefs-mic");
      fireEvent.click(prefsButton);
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("Privacy_Microphone"), "_blank");
    } finally {
      window.open = originalOpen;
    }
  });
});

describe("Onboarding — gating (BC-040 / Bug 25)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Onboarding_Llm_NextDisabled_UntilHealthGreen", async () => {
    (api.llmHealth as jest.Mock).mockResolvedValue(false);
    (api.listModels as jest.Mock).mockResolvedValue([
      { id: "whisper", installed: true, kind: "Stt", name: "whisper", sizeMb: 100, description: "", destinationPath: "", isDefault: true, url: "" },
    ]);
    renderOnboarding();
    // Walk forward to LLM step (index 3: welcome→models→obsidian→llm)
    await clickNext(3);
    await waitFor(() => {
      const nextBtn = screen.getByTestId("onboarding-next");
      expect(nextBtn).toBeDisabled();
    });

    // Flip health to reachable; Next unlocks on the next poll.
    (api.llmHealth as jest.Mock).mockResolvedValue(true);
    await waitFor(
      () => expect(screen.getByTestId("onboarding-next")).not.toBeDisabled(),
      { timeout: 5000 },
    );
  });

  it("Onboarding_Models_NextDisabled_UntilFileOrDownload", async () => {
    (api.llmHealth as jest.Mock).mockResolvedValue(true);
    (api.listModels as jest.Mock).mockResolvedValue([
      { id: "whisper", installed: false, kind: "Stt", name: "whisper", sizeMb: 100, description: "", destinationPath: "", isDefault: true, url: "" },
    ]);
    renderOnboarding();
    // Walk forward to Models step (index 1: welcome→models)
    await clickNext(1);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-next")).toBeDisabled();
    });

    (api.listModels as jest.Mock).mockResolvedValue([
      { id: "whisper", installed: true, kind: "Stt", name: "whisper", sizeMb: 100, description: "", destinationPath: "", isDefault: true, url: "" },
    ]);
    await waitFor(
      () => expect(screen.getByTestId("onboarding-next")).not.toBeDisabled(),
      { timeout: 5000 },
    );
  });

  it("Onboarding_Skip_Grey_60PercentOpacity", async () => {
    renderOnboarding();
    const skip = await screen.findByTestId("onboarding-skip");
    const opacity = parseFloat(window.getComputedStyle(skip).opacity);
    expect(opacity).toBeLessThanOrEqual(0.6);
  });

  it("Onboarding_Skip_Hidden_OnMacPermissionSteps", async () => {
    (api.llmHealth as jest.Mock).mockResolvedValue(true);
    (api.listModels as jest.Mock).mockResolvedValue([
      { id: "whisper", installed: true, kind: "Stt", name: "whisper", sizeMb: 100, description: "", destinationPath: "", isDefault: true, url: "" },
    ]);
    renderOnboarding();
    await waitFor(() => expect(screen.getByTestId("onboarding-next")).not.toBeDisabled());
    await clickNext(5); // now on mic permission step
    await waitFor(() =>
      expect(screen.queryByTestId("onboarding-skip")).not.toBeInTheDocument(),
    );
  });
});

describe("Onboarding — welcome animation + finish flag (TODO-6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    (api.llmHealth as jest.Mock).mockResolvedValue(true);
    (api.listModels as jest.Mock).mockResolvedValue([
      { id: "whisper", installed: true, kind: "Stt", name: "whisper", sizeMb: 100, description: "", destinationPath: "", isDefault: true, url: "" },
    ]);
  });

  it("Onboarding_Welcome_BrandAnimation_EntryFires", async () => {
    renderOnboarding();
    // BrandMark wrapper carries data-testid="onboarding-brand" and is driven by
    // framer-motion with a 300-450 ms easeOut entry (ADR-007 D15). Its presence
    // on step 1 is the contract; motion timing itself is validated on Mac.
    const brand = await screen.findByTestId("onboarding-brand");
    expect(brand).toBeInTheDocument();
  });

  it("Onboarding_Finish_WritesOnboardingComplete", async () => {
    expect(window.localStorage.getItem("mozgoslav.onboardingComplete")).toBeNull();

    renderOnboarding();
    // Walk through all 8 "Next" clicks. The 9th step is the final Ready screen;
    // clicking Next / Apply there navigates away and persists the flag.
    await clickNext(9);

    await waitFor(() =>
      expect(window.localStorage.getItem("mozgoslav.onboardingComplete")).toBe("true"),
    );
  });
});

// Silence the unused `act` import when the above block is compiled —
// keeps future maintainers free to reach for it without adding an import.
void act;
