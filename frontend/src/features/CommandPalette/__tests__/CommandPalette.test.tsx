import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {ThemeProvider} from "styled-components";
import {KBarProvider} from "kbar";

import CommandPalette from "../CommandPalette";
import {useCommandPaletteActions} from "../useCommandPaletteActions";
import {lightTheme} from "../../../styles/theme";
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

const ActionsRegistrar: React.FC<React.PropsWithChildren> = ({children}) => {
    useCommandPaletteActions();
    return <>{children}</>;
};

const renderPalette = () =>
    render(
        <MemoryRouter>
            <ThemeProvider theme={lightTheme}>
                <KBarProvider>
                    <ActionsRegistrar>
                        <CommandPalette/>
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

        fireEvent.keyDown(window, {key: "k", code: "KeyK", ctrlKey: true});

        await waitFor(() => {
            expect(screen.getByTestId("kbar-palette")).toBeInTheDocument();
        });
    });

    it("CommandPalette_NavigationAction_RoutesToPath", async () => {
        renderPalette();

        fireEvent.keyDown(window, {key: "k", code: "KeyK", ctrlKey: true});
        await waitFor(() =>
            expect(screen.getByTestId("kbar-palette")).toBeInTheDocument(),
        );

        const search = screen.getByTestId("kbar-search") as HTMLInputElement;
        fireEvent.change(search, {target: {value: "queue"}});

        const queueItem = await screen.findByTestId("kbar-item-nav-queue");
        fireEvent.click(queueItem);

        await waitFor(() => expect(lastNavigatedTo).toBe("/queue"));
    });

    it("CommandPalette_RendersFooterKeyboardHints", async () => {
        renderPalette();

        fireEvent.keyDown(window, {key: "k", code: "KeyK", ctrlKey: true});
        await waitFor(() =>
            expect(screen.getByTestId("kbar-palette")).toBeInTheDocument(),
        );

        const footer = screen.getByTestId("kbar-footer");
        expect(footer).toBeInTheDocument();
        expect(footer.textContent).toContain("↑");
        expect(footer.textContent).toContain("↓");
        expect(footer.textContent).toContain("↵");
        expect(footer.textContent).toContain("Esc");
    });

    it("CommandPalette_QuickAction_NewNote_DispatchesNoteCreate", async () => {
        renderPalette();

        fireEvent.keyDown(window, {key: "k", code: "KeyK", ctrlKey: true});
        await waitFor(() =>
            expect(screen.getByTestId("kbar-palette")).toBeInTheDocument(),
        );

        const search = screen.getByTestId("kbar-search") as HTMLInputElement;
        fireEvent.change(search, {target: {value: "new note"}});

        const newNoteItem = await screen.findByTestId("kbar-item-quick-new-note");
        fireEvent.click(newNoteItem);

        await waitFor(() =>
            expect(lastNavigatedTo).toMatch(/^\/notes\?new=1$/),
        );
    });
});
