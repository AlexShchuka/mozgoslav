import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";

import AudioLevelMeter from "../AudioLevelMeter";
import { lightTheme } from "../../../styles/theme";

describe("AudioLevelMeter", () => {
  it("renders a meter region even when stream is null", () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <AudioLevelMeter stream={null} />
      </ThemeProvider>
    );

    const meter = screen.getByRole("meter");
    expect(meter).toBeInTheDocument();
    expect(meter.getAttribute("aria-valuemin")).toBe("0");
    expect(meter.getAttribute("aria-valuemax")).toBe("1");
  });

  it("exposes the rms and peak layer test ids for downstream inspection", () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <AudioLevelMeter stream={null} testId="level-test" />
      </ThemeProvider>
    );

    expect(screen.getByTestId("level-test")).toBeInTheDocument();
    expect(screen.getByTestId("audio-level-meter-rms")).toBeInTheDocument();
    expect(screen.getByTestId("audio-level-meter-peak")).toBeInTheDocument();
  });
});
