import type { ReactElement } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import "../../../i18n";
import { renderWithStore } from "../../../testUtils";
import { SUBMIT_ASK } from "../../../store/slices/ask/actions";
import Ask from "../Ask";
import AskContainer from "../Ask.container";
import type { AskMessage } from "../types";

const noop = () => undefined;

const buildMessage = (patch: Partial<AskMessage> & { id: string }): AskMessage => ({
  role: "user",
  content: "question",
  citations: [],
  state: "done",
  ...patch,
});

const renderAsk = (ui: ReactElement) => renderWithStore(<MemoryRouter>{ui}</MemoryRouter>);

describe("Ask — presentational", () => {
  it("renders empty state when no messages", () => {
    renderAsk(<Ask messages={[]} isAsking={false} onAsk={noop} />);
    expect(screen.getByTestId("ask-message-list")).toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    const messages: AskMessage[] = [
      buildMessage({ id: "u1", role: "user", content: "What is life?" }),
      buildMessage({ id: "a1", role: "assistant", content: "42." }),
    ];
    renderAsk(<Ask messages={messages} isAsking={false} onAsk={noop} />);
    expect(screen.getByText("What is life?")).toBeInTheDocument();
    expect(screen.getByText("42.")).toBeInTheDocument();
  });

  it("shows pending indicator while assistant is thinking", () => {
    const messages: AskMessage[] = [
      buildMessage({ id: "a1", role: "assistant", content: "", state: "pending" }),
    ];
    renderAsk(<Ask messages={messages} isAsking={true} onAsk={noop} />);
    expect(screen.getByLabelText("ask-pending")).toBeInTheDocument();
  });

  it("calls onAsk with question text and includeWeb when form submitted", async () => {
    const user = userEvent.setup();
    const onAsk = jest.fn();
    renderAsk(<Ask messages={[]} isAsking={false} onAsk={onAsk} />);

    await user.type(screen.getByTestId("ask-input"), "Who invented chess?");
    await user.keyboard("{Enter}");

    expect(onAsk).toHaveBeenCalledWith("Who invented chess?", expect.any(Boolean));
  });

  it("does not call onAsk when input is empty", async () => {
    const user = userEvent.setup();
    const onAsk = jest.fn();
    renderAsk(<Ask messages={[]} isAsking={false} onAsk={onAsk} />);

    await user.keyboard("{Enter}");

    expect(onAsk).not.toHaveBeenCalled();
  });

  it("disables input when isAsking is true", () => {
    renderAsk(<Ask messages={[]} isAsking={true} onAsk={noop} />);
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
          {
            source: "Web",
            reference: "Blog Post",
            snippet: "web snippet",
            url: "https://example.com",
          },
        ],
      }),
    ];
    renderAsk(<Ask messages={messages} isAsking={false} onAsk={noop} />);
    expect(screen.getByText("note-abc")).toBeInTheDocument();
    expect(screen.getByText("Blog Post")).toBeInTheDocument();
  });
});

describe("Ask — container", () => {
  it("dispatches SUBMIT_ASK when onAsk is called via container", async () => {
    const user = userEvent.setup();
    const { getActions } = renderWithStore(
      <MemoryRouter>
        <AskContainer />
      </MemoryRouter>
    );

    await user.type(screen.getByTestId("ask-input"), "test question");
    await user.keyboard("{Enter}");

    expect(getActions().some((a) => a.type === SUBMIT_ASK)).toBe(true);
  });
});
