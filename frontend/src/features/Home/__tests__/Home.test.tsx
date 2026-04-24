import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Home from "../Home";
import { renderWithStore } from "../../../testUtils";
import {
  mergeMockState,
  mockDictationState,
  mockAudioDevicesState,
  mockRecordingState,
} from "../../../testUtils/mockState";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";

jest.mock("../../../api/dictationPush", () => ({
  pushDictationAudio: jest.fn().mockResolvedValue(undefined),
}));

describe("Home — unified Dashboard + HomeList page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Dashboard controls and the unified HomeList on a single page", async () => {
    const preloaded = mergeMockState(
      mockDictationState(),
      mockAudioDevicesState(),
      mockRecordingState()
    );
    renderWithStore(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
      { theme: darkTheme, preloadedState: preloaded }
    );

    expect(await screen.findByTestId("dashboard-record")).toBeInTheDocument();
    expect(screen.getByTestId("home-list-scroll")).toBeInTheDocument();
  });
});
