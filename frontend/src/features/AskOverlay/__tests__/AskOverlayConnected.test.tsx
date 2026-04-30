import { act, fireEvent, screen } from "@testing-library/react";

import i18n from "../../../i18n";
import AskOverlayConnected from "../AskOverlayConnected";
import { renderWithStore } from "../../../testUtils";

type AnswerCallback = (payload: { question: string; answer: string }) => void;
type ErrorCallback = (payload: { message: string }) => void;

const buildBridgeMock = () => {
  let answerCb: AnswerCallback | undefined;
  let errorCb: ErrorCallback | undefined;
  const hideAskOverlay = jest.fn();

  const bridge = {
    onAskCorpusAnswer: jest.fn((cb: AnswerCallback) => {
      answerCb = cb;
      return jest.fn();
    }),
    onAskCorpusError: jest.fn((cb: ErrorCallback) => {
      errorCb = cb;
      return jest.fn();
    }),
    hideAskOverlay,
  };

  const triggerAnswer = (question: string, answer: string) => {
    answerCb?.({ question, answer });
  };

  const triggerError = (message: string) => {
    errorCb?.({ message });
  };

  return { bridge, hideAskOverlay, triggerAnswer, triggerError };
};

describe("AskOverlayConnected — bridge-driven state", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  afterAll(async () => {
    await i18n.changeLanguage("ru");
  });

  afterEach(() => {
    Object.defineProperty(window, "mozgoslav", { value: undefined, configurable: true });
  });

  it("renders empty initial state when no answer has arrived", () => {
    const { bridge } = buildBridgeMock();
    Object.defineProperty(window, "mozgoslav", { value: bridge, configurable: true });

    renderWithStore(<AskOverlayConnected />);

    expect(bridge.onAskCorpusAnswer).toHaveBeenCalledTimes(1);
    expect(bridge.onAskCorpusError).toHaveBeenCalledTimes(1);
  });

  it("renders question and answer after onAskCorpusAnswer fires", async () => {
    const { bridge, triggerAnswer } = buildBridgeMock();
    Object.defineProperty(window, "mozgoslav", { value: bridge, configurable: true });

    renderWithStore(<AskOverlayConnected />);

    await act(async () => {
      triggerAnswer("What is AI?", "AI stands for Artificial Intelligence.");
    });

    expect(screen.getByText("What is AI?")).toBeInTheDocument();
    expect(screen.getByText("AI stands for Artificial Intelligence.")).toBeInTheDocument();
  });

  it("renders error message after onAskCorpusError fires", async () => {
    const { bridge, triggerError } = buildBridgeMock();
    Object.defineProperty(window, "mozgoslav", { value: bridge, configurable: true });

    renderWithStore(<AskOverlayConnected />);

    await act(async () => {
      triggerError("Backend unreachable");
    });

    expect(screen.getByText("Backend unreachable")).toBeInTheDocument();
  });

  it("calls hideAskOverlay on close button click", async () => {
    const { bridge, hideAskOverlay } = buildBridgeMock();
    Object.defineProperty(window, "mozgoslav", { value: bridge, configurable: true });

    renderWithStore(<AskOverlayConnected />);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(hideAskOverlay).toHaveBeenCalledTimes(1);
  });

  it("does not crash when bridge is unavailable", () => {
    Object.defineProperty(window, "mozgoslav", { value: undefined, configurable: true });

    expect(() => renderWithStore(<AskOverlayConnected />)).not.toThrow();
  });
});
