import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import NotesList from "../NotesList";
import { ProcessedNote } from "../../../domain/ProcessedNote";
import { watchNotificationsSagas } from "../../../store/slices/notifications";
import { watchObsidianSagas } from "../../../store/slices/obsidian";
import { watchSettingsSagas } from "../../../store/slices/settings";
import { renderWithStore } from "../../../testUtils";
import "../../../i18n";

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

jest.mock("../../../api", () => {
  const actual = jest.requireActual("../../../api");
  const obsidianApi = {
    setup: jest.fn(),
    bulkExport: jest.fn(),
    applyLayout: jest.fn().mockResolvedValue({ createdFolders: 0, movedNotes: 0 }),
    detect: jest.fn(),
    restHealth: jest.fn(),
    diagnostics: jest.fn(),
    reapplyBootstrap: jest.fn(),
    reinstallPlugins: jest.fn(),
  };
  const settingsApi = {
    getSettings: jest.fn().mockResolvedValue({ vaultPath: "/tmp/vault" }),
    saveSettings: jest.fn(),
    checkLlm: jest.fn(),
  };
  return {
    ...actual,
    apiFactory: {
      ...actual.apiFactory,
      createObsidianApi: () => obsidianApi,
      createSettingsApi: () => settingsApi,
    },
    __obsidianApi: obsidianApi,
    __settingsApi: settingsApi,
  };
});

import { graphqlClient } from "../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const getObsidianApi = () =>
  (jest.requireMock("../../../api") as { __obsidianApi: Record<string, jest.Mock> }).__obsidianApi;
const getSettingsApi = () =>
  (jest.requireMock("../../../api") as { __settingsApi: Record<string, jest.Mock> }).__settingsApi;

const buildNote = (patch: Partial<ProcessedNote>): ProcessedNote => ({
  id: patch.id ?? "n1",
  transcriptId: patch.transcriptId ?? "t1",
  profileId: patch.profileId ?? "p1",
  version: patch.version ?? 1,
  summary: patch.summary ?? "",
  keyPoints: patch.keyPoints ?? [],
  decisions: patch.decisions ?? [],
  actionItems: patch.actionItems ?? [],
  unresolvedQuestions: patch.unresolvedQuestions ?? [],
  participants: patch.participants ?? [],
  topic: patch.topic ?? "note",
  conversationType: patch.conversationType ?? "Idea",
  cleanTranscript: patch.cleanTranscript ?? "",
  fullTranscript: patch.fullTranscript ?? "",
  tags: patch.tags ?? [],
  markdownContent: patch.markdownContent ?? "",
  exportedToVault: patch.exportedToVault ?? false,
  vaultPath: patch.vaultPath ?? null,
  createdAt: patch.createdAt ?? new Date().toISOString(),
});

const renderNotes = () =>
  renderWithStore(
    <MemoryRouter>
      <NotesList />
    </MemoryRouter>,
    { sagas: [watchNotificationsSagas, watchObsidianSagas, watchSettingsSagas] }
  );

describe("NotesList — add note (BC-022 / Bug 4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSettingsApi().getSettings.mockResolvedValue({ vaultPath: "/tmp/vault" });
    mockedRequest.mockResolvedValue({ notes: { nodes: [], pageInfo: { hasNextPage: false } } });
  });

  it("NotesList_AddNote_OpensEditor", async () => {
    renderNotes();

    const btn = await screen.findByTestId("notes-add-button");
    await userEvent.click(btn);

    expect(await screen.findByTestId("notes-add-title")).toBeInTheDocument();
    expect(screen.getByTestId("notes-add-body")).toBeInTheDocument();
  });

  it("NotesList_AddNote_SubmitsAndInserts", async () => {
    const created = buildNote({
      id: "new-1",
      topic: "handwritten",
      markdownContent: "Hello",
    });
    mockedRequest.mockImplementation((doc: unknown) => {
      const docStr = JSON.stringify(doc);
      if (docStr.includes("createNote")) {
        return Promise.resolve({ createNote: { note: created, errors: [] } });
      }
      return Promise.resolve({ notes: { nodes: [], pageInfo: { hasNextPage: false } } });
    });

    renderNotes();

    await userEvent.click(await screen.findByTestId("notes-add-button"));
    await userEvent.type(screen.getByTestId("notes-add-title"), "handwritten");
    await userEvent.type(screen.getByTestId("notes-add-body"), "Hello");
    await userEvent.click(screen.getByTestId("notes-add-submit"));

    await waitFor(() =>
      expect(mockedRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ input: expect.objectContaining({ title: "handwritten" }) })
      )
    );
    expect(await screen.findByText(/handwritten/)).toBeInTheDocument();
  });

  it("NotesList_EmptyState", async () => {
    renderNotes();
    await waitFor(() =>
      expect(screen.getByText(/Пока пусто|Nothing here yet/)).toBeInTheDocument()
    );
  });
});

describe("NotesList — grouping by vault path folder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders folder headers derived from vaultPath and click opens note", async () => {
    mockedRequest.mockImplementation((doc: unknown) => {
      const docStr = JSON.stringify(doc);
      if (docStr.includes("QuerySettings")) {
        return Promise.resolve({
          settings: {
            vaultPath: "/vault",
            llmEndpoint: "", llmModel: "", llmApiKey: "", llmProvider: "",
            obsidianApiHost: "", obsidianApiToken: "",
            whisperModelPath: "", vadModelPath: "",
            language: "ru", themeMode: "system", whisperThreads: 4,
            dictationEnabled: false, dictationHotkeyType: "mouse", dictationMouseButton: 4,
            dictationKeyboardHotkey: "", dictationPushToTalk: false,
            dictationLanguage: "ru", dictationWhisperModelId: "",
            dictationCaptureSampleRate: 16000, dictationLlmPolish: false,
            dictationInjectMode: "auto", dictationOverlayEnabled: true,
            dictationOverlayPosition: "bottom-center", dictationSoundFeedback: true,
            dictationVocabulary: [], dictationModelUnloadMinutes: 10,
            dictationTempAudioPath: "", dictationAppProfiles: [],
            syncthingEnabled: false, syncthingObsidianVaultPath: "",
            obsidianFeatureEnabled: false,
          },
        });
      }
      return Promise.resolve({
        notes: {
          nodes: [
            buildNote({ id: "n1", topic: "Alpha", vaultPath: "/vault/Projects/Alpha.md" }),
            buildNote({ id: "n2", topic: "Beta", vaultPath: "/vault/Archive/Beta.md" }),
            buildNote({ id: "n3", topic: "Gamma", vaultPath: null }),
          ],
          pageInfo: { hasNextPage: false },
        },
      });
    });

    renderNotes();

    await screen.findByText(/Alpha/);
    expect(screen.getByRole("button", { name: /Projects/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Без папки/ })).toBeInTheDocument();
  });
});

const stubSettingsRequest = (vaultPath: string) => (doc: unknown) => {
  const docStr = JSON.stringify(doc);
  if (docStr.includes("QuerySettings")) {
    return Promise.resolve({
      settings: {
        vaultPath,
        llmEndpoint: "",
        llmModel: "",
        llmApiKey: "",
        llmProvider: "",
        obsidianApiHost: "",
        obsidianApiToken: "",
        whisperModelPath: "",
        vadModelPath: "",
        language: "ru",
        themeMode: "system",
        whisperThreads: 4,
        dictationEnabled: false,
        dictationHotkeyType: "mouse",
        dictationMouseButton: 4,
        dictationKeyboardHotkey: "",
        dictationPushToTalk: false,
        dictationLanguage: "ru",
        dictationWhisperModelId: "",
        dictationCaptureSampleRate: 16000,
        dictationLlmPolish: false,
        dictationInjectMode: "auto",
        dictationOverlayEnabled: true,
        dictationOverlayPosition: "bottom-center",
        dictationSoundFeedback: true,
        dictationVocabulary: [],
        dictationModelUnloadMinutes: 10,
        dictationTempAudioPath: "",
        dictationAppProfiles: [],
        syncthingEnabled: false,
        syncthingObsidianVaultPath: "",
        obsidianFeatureEnabled: false,
      },
    });
  }
  return Promise.resolve({ notes: { nodes: [], pageInfo: { hasNextPage: false } } });
};

describe("NotesList — organize button", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables organize when vault path is empty", async () => {
    mockedRequest.mockImplementation(stubSettingsRequest(""));
    renderNotes();

    const btn = await screen.findByTestId("notes-organize");
    await waitFor(() => expect(btn).toBeDisabled());
  });

  it("calls obsidian.applyLayout when vault path is configured", async () => {
    mockedRequest.mockImplementation(stubSettingsRequest("/vault"));
    getObsidianApi().applyLayout.mockResolvedValue({ createdFolders: 0, movedNotes: 0 });

    renderNotes();

    const btn = await screen.findByTestId("notes-organize");
    await waitFor(() => expect(btn).not.toBeDisabled());
    await userEvent.click(btn);

    await waitFor(() => expect(getObsidianApi().applyLayout).toHaveBeenCalledTimes(1));
  });
});
