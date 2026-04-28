import { fireEvent, screen } from "@testing-library/react";

import "../../../i18n";
import { renderWithStore } from "../../../testUtils";
import AskOverlay from "../AskOverlay";

const noop = () => undefined;

describe("AskOverlay — presentational", () => {
  it("renders overlayTitle from i18n", () => {
    renderWithStore(
      <AskOverlay question="" answer="" error={null} isLoading={false} onHide={noop} />
    );
    expect(screen.getByText("Ask Corpus")).toBeInTheDocument();
  });

  it("renders question text when provided", () => {
    renderWithStore(
      <AskOverlay question="What is time?" answer="" error={null} isLoading={false} onHide={noop} />
    );
    expect(screen.getByText("What is time?")).toBeInTheDocument();
  });

  it("shows loading spinner when isLoading is true", () => {
    renderWithStore(
      <AskOverlay question="Loading?" answer="" error={null} isLoading={true} onHide={noop} />
    );
    expect(screen.getByLabelText("ask-overlay-loading")).toBeInTheDocument();
  });

  it("shows answer when loaded and no error", () => {
    renderWithStore(
      <AskOverlay question="Q" answer="The answer." error={null} isLoading={false} onHide={noop} />
    );
    expect(screen.getByText("The answer.")).toBeInTheDocument();
  });

  it("shows error text when error is set", () => {
    renderWithStore(
      <AskOverlay
        question="Q"
        answer=""
        error="Something went wrong"
        isLoading={false}
        onHide={noop}
      />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("calls onHide when close button is clicked", () => {
    const onHide = jest.fn();
    renderWithStore(
      <AskOverlay question="" answer="" error={null} isLoading={false} onHide={onHide} />
    );
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("calls onHide when Escape is pressed", () => {
    const onHide = jest.fn();
    renderWithStore(
      <AskOverlay question="" answer="" error={null} isLoading={false} onHide={onHide} />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("does not show answer text when isLoading is true", () => {
    renderWithStore(
      <AskOverlay question="Q" answer="Should hide" error={null} isLoading={true} onHide={noop} />
    );
    expect(screen.queryByText("Should hide")).not.toBeInTheDocument();
  });

  it("renders empty state text when no question, answer, or error", () => {
    renderWithStore(
      <AskOverlay question="" answer="" error={null} isLoading={false} onHide={noop} />
    );
    expect(screen.getByText("Waiting for voice input…")).toBeInTheDocument();
  });
});
