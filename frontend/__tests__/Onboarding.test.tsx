import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";

import Onboarding from "../src/features/Onboarding/Onboarding";
import { darkTheme } from "../src/styles/theme";
import "../src/i18n";

const renderOnboarding = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={darkTheme}>
        <Onboarding />
      </ThemeProvider>
    </MemoryRouter>
  );

const clickNext = (times: number): void => {
  for (let i = 0; i < times; i++) {
    fireEvent.click(screen.getByRole("button", { name: /Дальше|Next/ }));
  }
};

describe("Onboarding — dictation permissions steps", () => {
  it("renders eight step dots (was five before dictation permissions)", () => {
    // Every .sc-* dot in StepDots is one step indicator; we bumped the total
    // from 5 to 8 when adding Microphone / Accessibility / Input Monitoring.
    renderOnboarding();
    const dots = document.querySelectorAll("[class*='sc-'][class*='dIrNh']");
    expect(dots.length).toBeGreaterThanOrEqual(8);
  });

  it("renders language step first", () => {
    renderOnboarding();
    expect(screen.getByText(/Язык|Language/)).toBeInTheDocument();
  });

  it("reaches microphone-access step after four clicks", async () => {
    renderOnboarding();
    clickNext(4);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-open-prefs-step5")).toBeInTheDocument();
    });
  });

  it("reaches accessibility step after five clicks", async () => {
    renderOnboarding();
    clickNext(5);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-open-prefs-step6")).toBeInTheDocument();
    });
  });

  it("reaches input-monitoring step after six clicks", async () => {
    renderOnboarding();
    clickNext(6);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-open-prefs-step7")).toBeInTheDocument();
    });
  });

  it("drops the permissions button on the final step", async () => {
    renderOnboarding();
    clickNext(7);
    await waitFor(() => {
      expect(screen.queryByTestId(/onboarding-open-prefs/)).not.toBeInTheDocument();
    });
  });

  it("opens system preferences when the user clicks the button", async () => {
    const openSpy = jest.fn();
    const originalOpen = window.open;
    window.open = openSpy as unknown as typeof window.open;

    try {
      renderOnboarding();
      clickNext(4);
      const prefsButton = await screen.findByTestId("onboarding-open-prefs-step5");
      fireEvent.click(prefsButton);
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("Privacy_Microphone"), "_blank");
    } finally {
      window.open = originalOpen;
    }
  });
});
