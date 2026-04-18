import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";

import HotkeyRecorder from "../HotkeyRecorder";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";

const renderRecorder = (initial = "", onChange: (v: string) => void = () => {}) =>
  render(
    <ThemeProvider theme={darkTheme}>
      <HotkeyRecorder value={initial} onChange={onChange} />
    </ThemeProvider>,
  );

describe("HotkeyRecorder (task #10)", () => {
  it("shows the 'press a combination' placeholder while recording", () => {
    renderRecorder();
    const field = screen.getByTestId("hotkey-recorder");
    fireEvent.click(field);
    expect(field).toHaveTextContent(/Нажми/i);
  });

  it("emits CommandOrControl+Shift+Space when recording that combo", () => {
    const onChange = jest.fn();
    renderRecorder("", onChange);

    const field = screen.getByTestId("hotkey-recorder");
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: " ", code: "Space", metaKey: true, shiftKey: true });

    expect(onChange).toHaveBeenCalledWith("CommandOrControl+Shift+Space");
  });

  it("uppercases letters and orders modifiers consistently", () => {
    const onChange = jest.fn();
    renderRecorder("", onChange);

    const field = screen.getByTestId("hotkey-recorder");
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: "a", code: "KeyA", ctrlKey: true, altKey: true });

    expect(onChange).toHaveBeenCalledWith("CommandOrControl+Alt+A");
  });

  it("maps arrow keys to Electron names", () => {
    const onChange = jest.fn();
    renderRecorder("", onChange);

    const field = screen.getByTestId("hotkey-recorder");
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: "ArrowRight", code: "ArrowRight", ctrlKey: true });

    expect(onChange).toHaveBeenCalledWith("CommandOrControl+Right");
  });

  it("ignores presses of only modifier keys", () => {
    const onChange = jest.fn();
    renderRecorder("", onChange);

    const field = screen.getByTestId("hotkey-recorder");
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: "Shift", code: "ShiftLeft", shiftKey: true });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("refuses to bind a plain key without any modifier (lockout guard)", () => {
    const onChange = jest.fn();
    renderRecorder("", onChange);

    const field = screen.getByTestId("hotkey-recorder");
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: "a", code: "KeyA" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("Clear button wipes the binding", () => {
    const onChange = jest.fn();
    renderRecorder("CommandOrControl+Shift+Space", onChange);

    fireEvent.click(screen.getByTestId("hotkey-recorder-clear"));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("renders the stored accelerator in a friendly form", () => {
    renderRecorder("CommandOrControl+Shift+Space");
    expect(screen.getByTestId("hotkey-recorder")).toHaveTextContent("⌘/Ctrl + Shift + Space");
  });
});
