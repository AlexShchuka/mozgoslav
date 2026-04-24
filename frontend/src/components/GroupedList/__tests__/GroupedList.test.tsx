import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";

import GroupedList from "../GroupedList";
import { darkTheme } from "../../../styles/theme";

interface Item {
  id: string;
  name: string;
  path: string | null;
}

const withTheme = (ui: React.ReactElement) => <ThemeProvider theme={darkTheme}>{ui}</ThemeProvider>;

const mk = (id: string, name: string, path: string | null): Item => ({ id, name, path });

describe("GroupedList", () => {
  it("renders flat list when no items have a group path", () => {
    render(
      withTheme(
        <GroupedList
          items={[mk("a", "Alpha", null), mk("b", "Beta", null)]}
          getId={(i) => i.id}
          renderPrimary={(i) => i.name}
        />
      )
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { expanded: true })).not.toBeInTheDocument();
  });

  it("renders tree with folder headers when paths present", () => {
    render(
      withTheme(
        <GroupedList
          items={[
            mk("a", "Alpha", "Projects/Client"),
            mk("b", "Beta", "Projects/Client"),
            mk("c", "Gamma", "Archive"),
          ]}
          getId={(i) => i.id}
          getGroupPath={(i) => i.path}
          renderPrimary={(i) => i.name}
        />
      )
    );

    expect(screen.getByRole("button", { name: /Projects/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive/ })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("collapses and expands group on header click", async () => {
    const user = userEvent.setup();
    render(
      withTheme(
        <GroupedList
          items={[mk("a", "Alpha", "Archive")]}
          getId={(i) => i.id}
          getGroupPath={(i) => i.path}
          renderPrimary={(i) => i.name}
        />
      )
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Archive/ }));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Archive/ }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("calls onItemClick on row click", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      withTheme(
        <GroupedList
          items={[mk("a", "Alpha", null)]}
          getId={(i) => i.id}
          renderPrimary={(i) => i.name}
          onItemClick={onClick}
        />
      )
    );

    await user.click(screen.getByRole("button", { name: /Alpha/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
  });

  it("activates row by Enter key", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      withTheme(
        <GroupedList
          items={[mk("a", "Alpha", null)]}
          getId={(i) => i.id}
          renderPrimary={(i) => i.name}
          onItemClick={onClick}
        />
      )
    );

    const row = screen.getByRole("button", { name: /Alpha/ });
    row.focus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not propagate row click when action area is clicked", async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();
    const onActionClick = jest.fn();
    render(
      withTheme(
        <GroupedList
          items={[mk("a", "Alpha", null)]}
          getId={(i) => i.id}
          renderPrimary={(i) => i.name}
          renderActions={() => (
            <button type="button" onClick={onActionClick}>
              X
            </button>
          )}
          onItemClick={onRowClick}
        />
      )
    );

    await user.click(screen.getByRole("button", { name: "X" }));
    expect(onActionClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("groups ungrouped items under ungroupedLabel when tree has groups", () => {
    render(
      withTheme(
        <GroupedList
          items={[mk("a", "Alpha", "Archive"), mk("b", "Beta", null)]}
          getId={(i) => i.id}
          getGroupPath={(i) => i.path}
          renderPrimary={(i) => i.name}
          ungroupedLabel="No folder"
        />
      )
    );

    expect(screen.getByRole("button", { name: /No folder/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive/ })).toBeInTheDocument();
  });
});
