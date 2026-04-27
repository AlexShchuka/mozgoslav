import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import RagChatContainer from "../RagChat.container";
import {
  renderWithStore,
  mergeMockState,
  mockRagState,
  mockSettingsState,
} from "../../../testUtils";
import "../../../i18n";

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => jest.fn(),
  };
});

const renderContainer = (preloadedState = {}) =>
  renderWithStore(
    <MemoryRouter>
      <RagChatContainer />
    </MemoryRouter>,
    { preloadedState }
  );

describe("RagChat.container", () => {
  it("RagChat_OnMount_DispatchesLoadRagStatus", async () => {
    const { getActions } = renderContainer(mergeMockState(mockRagState(), mockSettingsState()));

    await waitFor(() => expect(getActions().some((a) => a.type === "rag/LOAD_STATUS")).toBe(true));
  });

  it("RagChat_WithStatus_ShowsStatusText", async () => {
    renderContainer(
      mergeMockState(
        mockRagState({ status: { embeddedNotes: 42, chunks: 100 } }),
        mockSettingsState()
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId("rag-status")).toBeInTheDocument();
    });
  });

  it("RagChat_IsReindexingFromStore_ShowsLoadingButton", async () => {
    renderContainer(mergeMockState(mockRagState({ isReindexing: true }), mockSettingsState()));

    const btn = await screen.findByTestId("rag-reindex");
    expect(btn).toBeDisabled();
  });

  it("RagChat_WithNoStatus_ShowsStatusUnknown", async () => {
    renderContainer(mergeMockState(mockRagState({ status: null }), mockSettingsState()));

    await waitFor(() => {
      const el = screen.getByTestId("rag-status");
      expect(el).toBeInTheDocument();
    });
  });
});
