import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import OnboardingCompleteGuard from "../OnboardingCompleteGuard";
import { ROUTES } from "../../constants/routes";
import { ONBOARDING_COMPLETE_STORAGE_KEY } from "../../store/slices/onboarding";

const ProtectedPage = () => <div data-testid="protected">protected-content</div>;
const OnboardingPage = () => <div data-testid="onboarding">onboarding-content</div>;

const renderGuarded = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
        <Route
          path="/protected"
          element={
            <OnboardingCompleteGuard>
              <ProtectedPage />
            </OnboardingCompleteGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("OnboardingCompleteGuard (TEMP dev override — task #15)", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("redirects to onboarding even when completion flag is set to true", () => {
    window.localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, "true");

    renderGuarded("/protected");

    expect(screen.queryByTestId("protected")).toBeNull();
    expect(screen.getByTestId("onboarding")).toBeInTheDocument();
  });

  it("redirects to onboarding when completion flag is absent", () => {
    renderGuarded("/protected");

    expect(screen.queryByTestId("protected")).toBeNull();
    expect(screen.getByTestId("onboarding")).toBeInTheDocument();
  });
});
