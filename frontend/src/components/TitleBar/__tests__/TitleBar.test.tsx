import {render, screen} from "@testing-library/react";
import {ThemeProvider} from "styled-components";

import TitleBar from "../TitleBar";
import {darkTheme} from "../../../styles/theme";
import "../../../i18n";

describe("TitleBar", () => {
    it("renders the application name as its draggable label", () => {
        render(
            <ThemeProvider theme={darkTheme}>
                <TitleBar/>
            </ThemeProvider>,
        );

        const header = screen.getByRole("banner");
        expect(header).toBeInTheDocument();
        expect(header.textContent).toMatch(/мозгослав|mozgoslav/i);
    });

    it("exposes a header landmark dedicated to window-drag", () => {
        const {container} = render(
            <ThemeProvider theme={darkTheme}>
                <TitleBar/>
            </ThemeProvider>,
        );

        const styleTags = Array.from(container.ownerDocument.querySelectorAll("style"));
        const combined = styleTags.map((tag) => tag.textContent ?? "").join("\n");
        expect(combined).toMatch(/-webkit-app-region:\s*drag/);
    });
});
