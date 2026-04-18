import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";

import TitleBar from "../TitleBar";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";

describe("TitleBar", () => {
  it("renders the application name as its draggable label", () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <TitleBar />
      </ThemeProvider>,
    );

    // The label must surface the localised app.name ("Mozgoslav" / "Мозгослав").
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
    expect(header.textContent).toMatch(/мозгослав|mozgoslav/i);
  });

  it("exposes a header landmark dedicated to window-drag", () => {
    const { container } = render(
      <ThemeProvider theme={darkTheme}>
        <TitleBar />
      </ThemeProvider>,
    );

    // jsdom does not resolve styled-component rules, so inspect the generated
    // stylesheet for the `-webkit-app-region: drag` rule that ships with the
    // root header. This guards against a regression where the drag region
    // accidentally moves back to the sidebar.
    const styleTags = Array.from(container.ownerDocument.querySelectorAll("style"));
    const combined = styleTags.map((tag) => tag.textContent ?? "").join("\n");
    expect(combined).toMatch(/-webkit-app-region:\s*drag/);
  });
});
