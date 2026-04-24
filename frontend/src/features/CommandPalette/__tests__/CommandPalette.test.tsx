import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { KBarProvider } from "kbar";

import CommandPalette from "../CommandPalette";
import { useCommandPaletteActions } from "../useCommandPaletteActions";
import {
  renderWithStore,
  mergeMockState,
  mockSettingsState,
  mockRagState,
} from "../../../testUtils";
import "../../../i18n";

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

const ActionsRegistrar: React.FC<React.PropsWithChildren> = ({ children }) => {
  useCommandPaletteActions();
  return <>{children}</>;
};

const renderPalette = (preloadedState = {}) =>
  renderWithStore(
    <MemoryRouter>
      <KBarProvider>
        <ActionsRegistrar>
          <CommandPalette />
        </ActionsRegistrar>
      </KBarProvider>
    </MemoryRouter>,
    { preloadedState }
  );

describe("CommandPalette — kbar integration", () => {
  beforeEach(() => {
    lastNavigatedTo = null;
  });

  it("CommandPalette_CtrlK_OpensOverlay", async () => {
    renderPalette();

    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId("kbar-palette")).toBeInTheDocument();
    });
  });

  it("CommandPalette_NavigationAction_RoutesToPath", async () => {
    renderPalette();

    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => expect(screen.getByTestId("kbar-palette")).toBeInTheDocument());

    const search = screen.getByTestId("kbar-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "queue" } });

    const queueItem = await screen.findByTestId("kbar-item-nav-queue");
    fireEvent.click(queueItem);

    await waitFor(() => expect(lastNavigatedTo).toBe("/queue"));
  });

  it("CommandPalette_RendersFooterKeyboardHints", async () => {
    renderPalette();

    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => expect(screen.getByTestId("kbar-palette")).toBeInTheDocument());

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
    await waitFor(() => expect(screen.getByTestId("kbar-palette")).toBeInTheDocument());

    const search = screen.getByTestId("kbar-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "new note" } });

    const newNoteItem = await screen.findByTestId("kbar-item-quick-new-note");
    fireEvent.click(newNoteItem);

    await waitFor(() => expect(lastNavigatedTo).toMatch(/^\/notes\?new=1$/));
  });

  it("CommandPalette_QuickReindexRag_DispatchesReindexRag", async () => {
    const { getActions } = renderPalette(mergeMockState(mockSettingsState(), mockRagState()));

    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => expect(screen.getByTestId("kbar-palette")).toBeInTheDocument());

    const search = screen.getByTestId("kbar-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "reindex" } });

    const item = await screen.findByTestId("kbar-item-quick-reindex-rag");
    fireEvent.click(item);

    await waitFor(() => expect(getActions().some((a) => a.type === "rag/REINDEX")).toBe(true));
  });

  it("CommandPalette_QuickCreateBackup_DispatchesCreateBackup", async () => {
    const { getActions } = renderPalette(mergeMockState(mockSettingsState(), mockRagState()));

    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => expect(screen.getByTestId("kbar-palette")).toBeInTheDocument());

    const search = screen.getByTestId("kbar-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "snapshot" } });

    const item = await screen.findByTestId("kbar-item-quick-create-backup");
    fireEvent.click(item);

    await waitFor(() => expect(getActions().some((a) => a.type === "backups/CREATE")).toBe(true));
  });
});
