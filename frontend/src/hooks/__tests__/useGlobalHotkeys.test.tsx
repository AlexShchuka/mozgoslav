import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { useGlobalHotkeys } from "../useGlobalHotkeys";

jest.mock("react-hotkeys-hook", () => ({
  useHotkeys: jest.fn(),
}));

const mockedUseHotkeys = jest.requireMock("react-hotkeys-hook").useHotkeys as jest.Mock;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

describe("useGlobalHotkeys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers mod+comma hotkey on mount", () => {
    renderHook(() => useGlobalHotkeys(), { wrapper });

    const registeredKeys = mockedUseHotkeys.mock.calls.map(
      (call: [string, ...unknown[]]) => call[0]
    );
    expect(registeredKeys).toContain("mod+comma");
  });

  it("registers mod+shift+n hotkey on mount", () => {
    renderHook(() => useGlobalHotkeys(), { wrapper });

    const registeredKeys = mockedUseHotkeys.mock.calls.map(
      (call: [string, ...unknown[]]) => call[0]
    );
    expect(registeredKeys).toContain("mod+shift+n");
  });

  it("registers exactly two hotkeys", () => {
    renderHook(() => useGlobalHotkeys(), { wrapper });

    expect(mockedUseHotkeys).toHaveBeenCalledTimes(2);
  });

  it("re-registers hotkeys on re-render without conflict", () => {
    const { rerender } = renderHook(() => useGlobalHotkeys(), { wrapper });
    rerender();

    const registeredKeys = mockedUseHotkeys.mock.calls.map(
      (call: [string, ...unknown[]]) => call[0]
    );
    expect(registeredKeys.filter((k: string) => k === "mod+comma").length).toBeGreaterThanOrEqual(
      1
    );
    expect(registeredKeys.filter((k: string) => k === "mod+shift+n").length).toBeGreaterThanOrEqual(
      1
    );
  });
});
