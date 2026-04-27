import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { renderWithStore } from "../../../testUtils";
import { SUBMIT_ASK } from "../../../store/slices/ask/actions";
import Ask from "../Ask";
import AskContainer from "../Ask.container";
import type { AskMessage } from "../types";

const noop = () => undefined;

const buildMessage = (
  patch: Partial<AskMessage> & { id: string }
): AskMessage => ({
  role: "user",
  content: "question",
  citations: [],
  state: "done",
  ...patch,
});

describe("Ask — presentational", () => {
  it("renders empty state when no messages", () => {
    renderWithStore(
      <Ask messages={[]} isAsking={false} onAsk={noop} />
    );
    expect(screen.getByTestId("ask-message-list")).toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    const messages: AskMessage[] = [
      buildMessage({ id: "u1", role: "user", content: "What is life?" }),
      buildMessage({ id: "a1", role: "assistant", content: "42." }),
    ];
    renderWithStore(<Ask messages={messages} isAsking={false} onAsk={noop} />);
    expect(screen.getByText("What is life?")).toBeInTheDocument();
    expect(screen.getByText("42.")).toBeInTheDocument();
  });

  it("shows pending indicator while assistant is thinking", () => {
    const messages: AskMessage[] = [
      buildMessage({ id: "a1", role: "assistant", content: "", state: "pending" }),
    ];
    renderWithStore(<Ask messages={messages} isAsking={true} onAsk={noop} />);
    expect(screen.getByLabelText("ask-pending")).toBeInTheDocument();
  });

  it("calls onAsk with question text and includeWeb when form submitted", async () => {
    const user = userEvent.setup();
    const onAsk = jest.fn();
    renderWithStore(<Ask messages={[]} isAsking={false} onAsk={onAsk} />);

    await user.type(screen.getByTestId("ask-input"), "Who invented chess?");
    await user.keyboard("{Enter}");

    expect(onAsk).toHaveBeenCalledWith("Who invented chess?", expect.any(Boolean));
  });

  it("does not call onAsk when input is empty", async () => {
    const user = userEvent.setup();
    const onAsk = jest.fn();
    renderWithStore(<Ask messages={[]} isAsking={false} onAsk={onAsk} />);

    await user.keyboard("{Enter}");

    expect(onAsk).not.toHaveBeenCalled();
  });

  it("disables input when isAsking is true", () => {
    renderWithStore(
      <Ask messages={[]} isAsking={true} onAsk={noop} />
    );
    expect(screen.getByTestId<HTMLTextAreaElement>("ask-input").disabled).toBe(true);
  });

  it("renders corpus citations grouped separately from web citations", () => {
    const messages: AskMessage[] = [
      buildMessage({
        id: "a1",
        role: "assistant",
        content: "Answer with sources.",
        citations: [
          { source: "Corpus", reference: "note-abc", snippet: "corp snippet", url: null },
          { source: "Web", reference: "Blog Post", snippet: "web snippet", url: "https://example.com" },
        ],
      }),
    ];
    renderWithStore(<Ask messages={messages} isAsking={false} onAsk={noop} />);
    expect(screen.getByText("note-abc")).toBeInTheDocument();
    expect(screen.getByText("Blog Post")).toBeInTheDocument();
  });
});

describe("Ask — container", () => {
  it("dispatches SUBMIT_ASK when onAsk is called via container", async () => {
    const user = userEvent.setup();
    const { getActions } = renderWithStore(<AskContainer />);

    await user.type(screen.getByTestId("ask-input"), "test question");
    await user.keyboard("{Enter}");

    expect(getActions().some((a) => a.type === SUBMIT_ASK)).toBe(true);
  });
});
