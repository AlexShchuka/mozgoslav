import { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { applyMiddleware, createStore, type Middleware } from "redux";
import { ThemeProvider } from "styled-components";

import Layout from "../Layout";
import { ROUTES } from "../../../constants/routes";
import { rootReducer } from "../../../store/rootReducer";
import { RESET_ONBOARDING } from "../../../store/slices/onboarding";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";

jest.mock("../../../hooks/useBackendHealth", () => ({
  useBackendHealth: () => ({ status: "ok", lastCheckedAt: new Date() }),
}));

const OnboardingMock = () => <div data-testid="onboarding-marker">onboarding</div>;

describe("Layout help button", () => {
  it("dispatches RESET_ONBOARDING and navigates to /onboarding on click", () => {
    const dispatched: string[] = [];
    const spyMiddleware: Middleware = () => (next) => (action: unknown) => {
      if (action && typeof (action as { type?: unknown }).type === "string") {
        dispatched.push((action as { type: string }).type);
      }
      return next(action);
    };
    const store = createStore(rootReducer, applyMiddleware(spyMiddleware));

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>
        <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
      </Provider>
    );

    render(
      <MemoryRouter initialEntries={[ROUTES.home]}>
        <Routes>
          <Route
            path="/*"
            element={
              <Layout>
                <div data-testid="page-body">home page</div>
              </Layout>
            }
          />
          <Route path={ROUTES.onboarding} element={<OnboardingMock />} />
        </Routes>
      </MemoryRouter>,
      { wrapper: Wrapper }
    );

    const button = screen.getByTestId("sidebar-restart-onboarding");
    fireEvent.click(button);

    expect(dispatched).toContain(RESET_ONBOARDING);
    expect(screen.getByTestId("onboarding-marker")).toBeInTheDocument();
  });
});
