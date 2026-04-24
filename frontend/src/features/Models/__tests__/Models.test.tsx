import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Models from "../Models";
import { renderWithStore } from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => jest.fn()),
    dispose: jest.fn(),
  })),
}));

import { graphqlClient } from "../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const fakeModel = {
  __typename: "ModelEntry" as const,
  id: "whisper-small-russian-bundle",
  name: "Whisper Small",
  description: "Bundled STT",
  url: "u",
  sizeMb: 260,
  kind: "STT" as const,
  tier: "BUNDLE" as const,
  isDefault: false,
  destinationPath: "/models/ggml-small-q8_0.bin",
  installed: false,
};

const renderModels = () =>
  renderWithStore(
    <MemoryRouter>
      <Models />
    </MemoryRouter>,
    { theme: darkTheme }
  );

describe("Models page — task #13 inline download progress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequest.mockResolvedValue({ models: [fakeModel] });
  });

  it("mounts <ModelDownloadProgress/> under a row when Download is clicked", async () => {
    mockedRequest.mockResolvedValueOnce({ models: [fakeModel] }).mockResolvedValueOnce({
      downloadModel: { downloadId: "dl-abc", errors: [] },
    });

    renderModels();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /скачать/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /скачать/i }));

    await waitFor(() => expect(screen.getByTestId("model-download-dl-abc")).toBeInTheDocument());
  });

  it("does not mount progress before the click", async () => {
    renderModels();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /скачать/i })).toBeInTheDocument()
    );

    expect(screen.queryByTestId(/^model-download-/)).toBeNull();
  });
});
