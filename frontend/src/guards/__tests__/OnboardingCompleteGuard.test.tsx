import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { combineReducers, createStore } from "redux";

import OnboardingCompleteGuard from "../OnboardingCompleteGuard";
import { ROUTES } from "../../constants/routes";
import { completionLoaded, onboardingReducer } from "../../store/slices/onboarding";

const ProtectedPage = () => <div data-testid="protected">protected-content</div>;
const OnboardingPage = () => <div data-testid="onboarding">onboarding-content</div>;

const renderGuarded = (initialPath: string, completed: boolean) => {
  // Use the real onboarding reducer; dispatch `completionLoaded(completed)` to
  // seed state exactly like the persist saga would on boot.
  const store = createStore(combineReducers({ onboarding: onboardingReducer }));
  // redux v5 dispatch expects `UnknownAction` (index-signature); our slice
  // actions are discriminated unions. Widen locally, mirroring the dispatch
  // pattern in features/Sync/Sync.tsx and components/Layout/Layout.tsx.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (store.dispatch as (action: any) => void)(completionLoaded(completed));

  return render(
    <Provider store={store}>
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
      </MemoryRouter>
    </Provider>,
  );
};

describe("OnboardingCompleteGuard", () => {
  it("renders children when onboarding has been completed", () => {
    renderGuarded("/protected", true);

    expect(screen.getByTestId("protected")).toBeInTheDocument();
    expect(screen.queryByTestId("onboarding")).toBeNull();
  });

  it("redirects to onboarding when the completion flag is false", () => {
    renderGuarded("/protected", false);

    expect(screen.queryByTestId("protected")).toBeNull();
    expect(screen.getByTestId("onboarding")).toBeInTheDocument();
  });
});
