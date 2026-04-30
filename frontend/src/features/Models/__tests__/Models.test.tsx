import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Models from "../Models";
import { renderWithStore, mockModelsState, mergeMockState } from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";
import { DOWNLOAD_MODEL_REQUESTED, LOAD_MODELS } from "../../../store/slices/models";
import { ModelKind, ModelTier } from "../../../api/gql/graphql";

const fakeModel = {
  __typename: "ModelEntry" as const,
  id: "whisper-small-russian-bundle",
  name: "Whisper Small",
  description: "Bundled STT",
  url: "u",
  sizeMb: 260,
  kind: ModelKind.Stt,
  tier: ModelTier.Bundle,
  isDefault: false,
  destinationPath: "/models/ggml-small-q8_0.bin",
  installed: false,
};

const renderModels = (stateOverride: Partial<ReturnType<typeof mockModelsState>> = {}) =>
  renderWithStore(
    <MemoryRouter>
      <Models />
    </MemoryRouter>,
    {
      theme: darkTheme,
      preloadedState: mergeMockState(
        mockModelsState({ byId: { [fakeModel.id]: fakeModel } }),
        stateOverride
      ),
    }
  );

describe("Models page — store-driven", () => {
  it("Models_OnMount_DispatchesLoadModels", () => {
    const { getActions } = renderModels();
    const actions = getActions();
    expect(actions.some((a) => a.type === LOAD_MODELS)).toBe(true);
  });

  it("Models_RendersModelsFromStore", () => {
    renderModels();
    expect(screen.getByText("Whisper Small")).toBeInTheDocument();
  });

  it("Models_Download_DispatchesDownloadModel", async () => {
    const { getActions } = renderModels();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /скачать/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /скачать/i }));

    await waitFor(() =>
      expect(
        getActions().some((a) => a.type === DOWNLOAD_MODEL_REQUESTED && a.payload === fakeModel.id)
      ).toBe(true)
    );
  });

  it("Models_ShowsProgressBar_WhenActiveDownload", () => {
    renderWithStore(
      <MemoryRouter>
        <Models />
      </MemoryRouter>,
      {
        theme: darkTheme,
        preloadedState: mergeMockState(
          mockModelsState({
            byId: { [fakeModel.id]: fakeModel },
            activeDownloads: { [fakeModel.id]: "dl-xyz" },
            downloadProgress: {
              "dl-xyz": { bytesRead: 1024, totalBytes: 10240, done: false, error: null },
            },
          })
        ),
      }
    );

    expect(screen.getByTestId("model-download-dl-xyz")).toBeInTheDocument();
  });

  it("does not mount progress before download starts", () => {
    renderModels();

    expect(screen.queryByTestId(/^model-download-/)).toBeNull();
  });
});

const fakeModelLlm = {
  __typename: "ModelEntry" as const,
  id: "llama-model",
  name: "LLaMA 3",
  description: "LLM model",
  url: "u2",
  sizeMb: 4000,
  kind: ModelKind.Llm,
  tier: ModelTier.Downloadable,
  isDefault: false,
  destinationPath: "/models/llama.bin",
  installed: false,
};

const renderModelsWithFilter = (initialUrl: string) =>
  renderWithStore(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Models />
    </MemoryRouter>,
    {
      theme: darkTheme,
      preloadedState: mergeMockState(
        mockModelsState({
          byId: {
            [fakeModel.id]: fakeModel,
            [fakeModelLlm.id]: fakeModelLlm,
          },
        })
      ),
    }
  );

describe("Models page — type filter chips", () => {
  it("chip click filters list to matching kind", async () => {
    const user = userEvent.setup();
    renderModelsWithFilter("/models");

    await user.click(screen.getByTestId("model-filter-STT"));

    expect(screen.getByText("Whisper Small")).toBeInTheDocument();
    expect(screen.queryByText("LLaMA 3")).not.toBeInTheDocument();
  });

  it("deeplink ?type=LLM applies filter on mount", () => {
    renderModelsWithFilter("/models?type=LLM");

    expect(screen.getByText("LLaMA 3")).toBeInTheDocument();
    expect(screen.queryByText("Whisper Small")).not.toBeInTheDocument();
  });

  it("All chip shows all models", async () => {
    const user = userEvent.setup();
    renderModelsWithFilter("/models?type=LLM");

    await user.click(screen.getByTestId("model-filter-all"));

    expect(screen.getByText("Whisper Small")).toBeInTheDocument();
    expect(screen.getByText("LLaMA 3")).toBeInTheDocument();
  });

  it("empty groups are hidden from the list", async () => {
    const user = userEvent.setup();
    renderModelsWithFilter("/models");

    await user.click(screen.getByTestId("model-filter-STT"));

    expect(screen.queryByText("LLaMA 3")).not.toBeInTheDocument();
  });
});
