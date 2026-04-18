import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { KBarProvider } from "kbar";

import CommandPalette from "../CommandPalette";
import { useCommandPaletteActions } from "../useCommandPaletteActions";
import { lightTheme } from "../../../styles/theme";
import "../../../i18n";

// react-router v7 still emits its own navigate; we assert via the URL
let lastNavigatedTo: string | null = null;

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => (path: string) => {
      lastNavigatedTo = path;
    },
  };
});

// Wrapper that mirrors main.tsx — KBarProvider + actions registered via the
// shared hook so the keyboard shortcut and actions are available.
const ActionsRegistrar: React.FC<React.PropsWithChildren> = ({ children }) => {
  useCommandPaletteActions();
  return <>{children}</>;
};

const renderPalette = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <KBarProvider>
          <ActionsRegistrar>
            <CommandPalette />
          </ActionsRegistrar>
        </KBarProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("CommandPalette — kbar integration", () => {
  beforeEach(() => {
    lastNavigatedTo = null;
  });

  it("CommandPalette_CtrlK_OpensOverlay", async () => {
    renderPalette();

    // Default kbar shortcut: cmd/ctrl+k toggles the palette.
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId("kbar-palette")).toBeInTheDocument();
    });
  });

  it("CommandPalette_NavigationAction_RoutesToPath", async () => {
    renderPalette();

    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() =>
      expect(screen.getByTestId("kbar-palette")).toBeInTheDocument(),
    );

    // kbar uses react-virtual — only a handful of rows render in jsdom's
    // 0-height viewport. Typing narrows the result set so the target row is
    // always within the rendered window.
    const search = screen.getByTestId("kbar-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "queue" } });

    const queueItem = await screen.findByTestId("kbar-item-nav-queue");
    fireEvent.click(queueItem);

    await waitFor(() => expect(lastNavigatedTo).toBe("/queue"));
  });

  it("CommandPalette_RendersFooterKeyboardHints", async () => {
    renderPalette();

    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() =>
      expect(screen.getByTestId("kbar-palette")).toBeInTheDocument(),
    );

    // U2 — themed chip row at the palette footer lists the core shortcuts
    // so users discover navigation without trial and error.
    const footer = screen.getByTestId("kbar-footer");
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain("↑");
    expect(footer.textContent).toContain("↓");
    expect(footer.textContent).toContain("↵");
    expect(footer.textContent).toContain("Esc");
  });

  it("CommandPalette_QuickAction_NewNote_DispatchesNoteCreate", async () => {
    renderPalette();

    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() =>
      expect(screen.getByTestId("kbar-palette")).toBeInTheDocument(),
    );

    const search = screen.getByTestId("kbar-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "new note" } });

    const newNoteItem = await screen.findByTestId("kbar-item-quick-new-note");
    fireEvent.click(newNoteItem);

    // "New Note" navigates to /notes with a ?new=1 hint the NotesList
    // picks up to auto-open its editor.
    await waitFor(() =>
      expect(lastNavigatedTo).toMatch(/^\/notes\?new=1$/),
    );
  });
});
