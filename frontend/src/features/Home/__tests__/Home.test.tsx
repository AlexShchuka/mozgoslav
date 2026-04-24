import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Home from "../Home";
import { renderWithStore } from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn().mockResolvedValue({ recordings: { nodes: [] }, jobs: { nodes: [] } }) },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

jest.mock("../../../api", () => {
  const actual = jest.requireActual("../../../api");
  const dictationStub = {
    start: jest.fn(),
    stop: jest.fn(),
    push: jest.fn(),
    audioCapabilities: jest.fn(),
  };
  return {
    ...actual,
    apiFactory: {
      ...actual.apiFactory,
      createDictationApi: () => dictationStub,
    },
    __dictationStub: dictationStub,
  };
});

describe("Home — unified Dashboard + HomeList page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Dashboard controls and the unified HomeList on a single page", async () => {
    renderWithStore(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
      { theme: darkTheme }
    );

    expect(await screen.findByTestId("dashboard-record")).toBeInTheDocument();
    expect(screen.getByTestId("home-list-scroll")).toBeInTheDocument();
  });
});
