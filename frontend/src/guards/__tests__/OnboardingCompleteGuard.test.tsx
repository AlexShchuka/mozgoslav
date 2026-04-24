import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { combineReducers, createStore, type Action } from "redux";

import OnboardingCompleteGuard from "../OnboardingCompleteGuard";
import { ROUTES } from "../../constants/routes";
import { completionLoaded, onboardingReducer } from "../../store/slices/onboarding";

const ProtectedPage = () => <div data-testid="protected">protected-content</div>;
const OnboardingPage = () => <div data-testid="onboarding">onboarding-content</div>;

const renderGuarded = (initialPath: string, completed: boolean) => {
  const store = createStore(combineReducers({ onboarding: onboardingReducer }));
  store.dispatch(completionLoaded(completed) as Action);

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
    </Provider>
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
