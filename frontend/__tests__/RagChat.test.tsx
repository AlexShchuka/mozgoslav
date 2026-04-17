import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";

import RagChat from "../src/features/RagChat/RagChat";
import { api } from "../src/api/MozgoslavApi";
import { lightTheme } from "../src/styles/theme";
import "../src/i18n";

jest.mock("../src/api/MozgoslavApi", () => ({
  api: {
    ragQuery: jest.fn(),
    ragReindex: jest.fn(),
  },
}));

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const renderChat = () =>
  render(
    <ThemeProvider theme={lightTheme}>
      <MemoryRouter>
        <RagChat />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe("RagChat", () => {
  beforeEach(() => jest.clearAllMocks());

  it("submits a question and renders the answer with citations", async () => {
    (api.ragQuery as jest.Mock).mockResolvedValue({
      answer: "Это ответ.",
      llmAvailable: true,
      citations: [{ noteId: "n1", chunkId: "c1", text: "цитата", score: 0.87 }],
    });

    renderChat();
    const textarea = screen.getByPlaceholderText(/Введи вопрос|Type a question/);
    await userEvent.type(textarea, "Что было на встрече?");
    await userEvent.click(screen.getByRole("button", { name: /Спросить|Ask/ }));

    expect(api.ragQuery).toHaveBeenCalledWith("Что было на встрече?");
    expect(await screen.findByText("Это ответ.")).toBeInTheDocument();
    expect(screen.getByText("цитата")).toBeInTheDocument();
    expect(screen.getByText("0.87")).toBeInTheDocument();
  });

  it("surfaces the llm-unavailable warning when backend degrades", async () => {
    (api.ragQuery as jest.Mock).mockResolvedValue({
      answer: "Raw citations only.",
      llmAvailable: false,
      citations: [],
    });

    renderChat();
    const textarea = screen.getByPlaceholderText(/Введи вопрос|Type a question/);
    await userEvent.type(textarea, "q");
    await userEvent.click(screen.getByRole("button", { name: /Спросить|Ask/ }));

    expect(await screen.findByText(/LLM недоступен|LLM unavailable/)).toBeInTheDocument();
  });
});
