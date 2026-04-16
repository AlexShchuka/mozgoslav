import { act, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";

import DictationOverlay from "../src/features/DictationOverlay/DictationOverlay";
import type { DictationOverlayState } from "../src/features/DictationOverlay/types";
import { darkTheme } from "../src/styles/theme";
import "../src/i18n";

type StateListener = (state: DictationOverlayState) => void;

interface OverlayTestWindow extends Window {
  mozgoslavOverlay?: {
    onStateChange: (listener: StateListener) => () => void;
  };
}

describe("DictationOverlay", () => {
  let storedListener: StateListener | null = null;

  beforeEach(() => {
    storedListener = null;
    (window as OverlayTestWindow).mozgoslavOverlay = {
      onStateChange: (listener) => {
        storedListener = listener;
        return () => {
          storedListener = null;
        };
      },
    };

    // jsdom doesn't ship a 2D canvas context; stub just enough so the waveform
    // draw call does not throw.
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      fillStyle: "",
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    delete (window as OverlayTestWindow).mozgoslavOverlay;
  });

  const renderOverlay = (initialState?: DictationOverlayState) =>
    render(
      <ThemeProvider theme={darkTheme}>
        <DictationOverlay initialState={initialState} />
      </ThemeProvider>
    );

  it("renders the idle placeholder by default", () => {
    renderOverlay();
    expect(screen.getByTestId("dictation-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("dictation-overlay-phase").textContent?.toLowerCase()).toMatch(
      /dictation|диктовка/i
    );
  });

  it("renders the partial transcript when recording state arrives", () => {
    renderOverlay();
    act(() => {
      storedListener?.({ phase: "recording", partialText: "привет как дела" });
    });
    expect(screen.getByTestId("dictation-overlay-text")).toHaveTextContent("привет как дела");
  });

  it("shows the spinner in the processing phase", () => {
    renderOverlay({ phase: "processing", partialText: "finalizing text" });
    expect(screen.getByTestId("dictation-overlay-spinner")).toBeInTheDocument();
  });

  it("hides the spinner outside the processing phase", () => {
    renderOverlay({ phase: "recording", partialText: "hello" });
    expect(screen.queryByTestId("dictation-overlay-spinner")).not.toBeInTheDocument();
  });

  it("renders the waveform canvas", () => {
    renderOverlay({ phase: "recording", partialText: "", levels: [0.1, 0.3, 0.8, 0.4, 0.2] });
    expect(screen.getByTestId("dictation-overlay-waveform")).toBeInTheDocument();
  });
});
