import type {ReactElement, ReactNode} from "react";
import {render, type RenderOptions, type RenderResult} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {ThemeProvider} from "styled-components";

import {lightTheme} from "../styles/theme";

export interface RenderWithRouterOptions {
    readonly initialEntries?: readonly string[];
    readonly initialIndex?: number;
    readonly theme?: typeof lightTheme;
    readonly renderOptions?: Omit<RenderOptions, "wrapper">;
}

/**
 * Renders a React tree wrapped in `MemoryRouter` (with optional initial
 * entries) and the default styled-components theme. Combine with
 * `renderWithStore` by nesting the store/Provider around the result.
 */
export const renderWithRouter = (
    ui: ReactElement,
    options: RenderWithRouterOptions = {},
): RenderResult => {
    const theme = options.theme ?? lightTheme;
    const Wrapper = ({children}: { children: ReactNode }) => (
        <MemoryRouter
            initialEntries={options.initialEntries ? [...options.initialEntries] : undefined}
            initialIndex={options.initialIndex}
        >
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </MemoryRouter>
    );
    return render(ui, {wrapper: Wrapper, ...options.renderOptions});
};
