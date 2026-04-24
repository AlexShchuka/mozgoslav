import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Onboarding from "../src/features/Onboarding";
import { watchOnboardingSagas } from "../src/store/slices/onboarding";
import { watchModelsSagas } from "../src/store/slices/models";
import { renderWithStore } from "../src/testUtils";
import { darkTheme } from "../src/styles/theme";
import "../src/i18n";

jest.mock("../src/api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

jest.mock("../src/api", () => {
  const actual = jest.requireActual("../src/api");
  const obsidianApi = {
    setup: jest.fn(),
    bulkExport: jest.fn(),
    applyLayout: jest.fn(),
    detect: jest.fn(),
    restHealth: jest.fn(),
    diagnostics: jest.fn(),
    reapplyBootstrap: jest.fn(),
    reinstallPlugins: jest.fn(),
  };
  return {
    ...actual,
    apiFactory: {
      ...actual.apiFactory,
      createObsidianApi: () => obsidianApi,
    },
  };
});

import { graphqlClient } from "../src/api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const bundleModels = [
  {
    id: "whisper-small-russian-bundle",
    name: "Whisper Small",
    description: "Bundled STT",
    url: "https://example/whisper-small.bin",
    sizeMb: 260,
    kind: "STT",
    tier: "BUNDLE",
    isDefault: false,
    destinationPath: "/models/ggml-small-q8_0.bin",
    installed: false,
  },
  {
    id: "silero-vad",
    name: "Silero VAD v6.2.0",
    description: "Bundled VAD",
    url: "https://example/silero.bin",
    sizeMb: 4,
    kind: "VAD",
    tier: "BUNDLE",
    isDefault: true,
    destinationPath: "/models/ggml-silero-v6.2.0.bin",
    installed: true,
  },
  {
    id: "whisper-large-v3-russian-antony66",
    name: "Antony66 RU",
    description: "Tier 2 not shown on onboarding",
    url: "https://example/antony66.bin",
    sizeMb: 1500,
    kind: "STT",
    tier: "DOWNLOADABLE",
    isDefault: true,
    destinationPath: "/models/antony66.bin",
    installed: false,
  },
];

const allInstalledModels = bundleModels.map((m) => ({ ...m, installed: true }));

const stubDefaultRequest = () => {
  mockedRequest.mockImplementation((doc: unknown) => {
    const docStr = JSON.stringify(doc);
    if (docStr.includes("QueryLlmHealth")) {
      return Promise.resolve({ llmHealth: { available: true } });
    }
    if (docStr.includes("QueryModels")) {
      return Promise.resolve({ models: allInstalledModels });
    }
    if (docStr.includes("QueryDictationAudioCapabilities")) {
      return Promise.resolve({
        dictationAudioCapabilities: {
          isSupported: true,
          detectedPlatform: "macos",
          permissionsRequired: ["microphone"],
        },
      });
    }
    if (docStr.includes("QueryObsidianDetect")) {
      return Promise.resolve({ obsidianDetect: { detected: [], searched: [] } });
    }
    if (docStr.includes("MutationDownloadModel")) {
      return Promise.resolve({ downloadModel: { downloadId: "dl-1", errors: [] } });
    }
    return Promise.resolve({});
  });
};

const renderOnboarding = () =>
  renderWithStore(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
    { sagas: [watchOnboardingSagas, watchModelsSagas], theme: darkTheme }
  );

const clickNext = async (times: number): Promise<void> => {
  for (let i = 0; i < times; i++) {
    await waitFor(() => expect(screen.getByTestId("onboarding-next")).not.toBeDisabled());
    fireEvent.click(screen.getByTestId("onboarding-next"));
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
  stubDefaultRequest();
});

describe("Onboarding — plan v0.8 Block 4 (slim, platform-aware)", () => {
  it("renders welcome step first (brand animation)", () => {
    renderOnboarding();
    expect(screen.getByTestId("onboarding-brand")).toBeInTheDocument();
  });

  it("renders eight step dots on macOS (task #12b adds models step)", async () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    renderOnboarding();
    await waitFor(() => {
      const dots = screen.getAllByTestId("onboarding-dot");
      expect(dots.length).toBe(8);
    });
  });

  it("renders fewer step dots on Linux (no mic/dictation permission cards)", async () => {
    Object.defineProperty(navigator, "platform", { value: "Linux x86_64", configurable: true });
    renderOnboarding();
    await waitFor(() => {
      const dots = screen.getAllByTestId("onboarding-dot");
      expect(dots.length).toBe(6);
    });
  });

  it("Next is always enabled (every step is skippable via Next per plan §5)", async () => {
    renderOnboarding();
    await waitFor(() => expect(screen.getByTestId("onboarding-next")).not.toBeDisabled());
  });

  it("writes onboardingComplete flag when user reaches the Ready step and clicks Apply", async () => {
    renderOnboarding();
    await clickNext(8);
    await waitFor(() =>
      expect(window.localStorage.getItem("mozgoslav.onboardingComplete")).toBe("true")
    );
  });

  it("task #12b — models step lists Tier 1 bundle models with installed/missing status", async () => {
    mockedRequest.mockImplementation((doc: unknown) => {
      const docStr = JSON.stringify(doc);
      if (docStr.includes("QueryModels")) {
        return Promise.resolve({ models: bundleModels });
      }
      if (docStr.includes("QueryLlmHealth")) {
        return Promise.resolve({ llmHealth: { available: true } });
      }
      if (docStr.includes("QueryDictationAudioCapabilities")) {
        return Promise.resolve({ dictationAudioCapabilities: { isSupported: true, detectedPlatform: "macos", permissionsRequired: ["microphone"] } });
      }
      if (docStr.includes("QueryObsidianDetect")) {
        return Promise.resolve({ obsidianDetect: { detected: [], searched: [] } });
      }
      return Promise.resolve({});
    });

    renderOnboarding();
    await clickNext(2);

    await waitFor(() =>
      expect(
        screen.getByTestId("onboarding-models-item-whisper-small-russian-bundle")
      ).toBeInTheDocument()
    );

    expect(screen.getByTestId("onboarding-models-item-silero-vad")).toBeInTheDocument();

    expect(
      screen.queryByTestId("onboarding-models-item-whisper-large-v3-russian-antony66")
    ).toBeNull();

    expect(screen.getByTestId("onboarding-models-download-all")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-next")).toBeDisabled();
  });

  it("task #12b — Next is enabled on models step only when every Tier 1 model is installed", async () => {
    mockedRequest.mockImplementation((doc: unknown) => {
      const docStr = JSON.stringify(doc);
      if (docStr.includes("QueryModels")) {
        return Promise.resolve({
          models: [
            { ...bundleModels[0], installed: true },
            { ...bundleModels[1], installed: true },
          ],
        });
      }
      if (docStr.includes("QueryLlmHealth")) {
        return Promise.resolve({ llmHealth: { available: true } });
      }
      if (docStr.includes("QueryDictationAudioCapabilities")) {
        return Promise.resolve({ dictationAudioCapabilities: { isSupported: true, detectedPlatform: "macos", permissionsRequired: [] } });
      }
      if (docStr.includes("QueryObsidianDetect")) {
        return Promise.resolve({ obsidianDetect: { detected: [], searched: [] } });
      }
      return Promise.resolve({});
    });

    renderOnboarding();
    await clickNext(2);

    await waitFor(() => expect(screen.getByTestId("onboarding-next")).not.toBeDisabled());
    expect(screen.queryByTestId("onboarding-models-download-all")).toBeNull();
  });

  it("task #12b — Скачать всё triggers download mutation for every missing Tier 1 model", async () => {
    mockedRequest.mockImplementation((doc: unknown) => {
      const docStr = JSON.stringify(doc);
      if (docStr.includes("QueryModels")) {
        return Promise.resolve({ models: bundleModels });
      }
      if (docStr.includes("QueryLlmHealth")) {
        return Promise.resolve({ llmHealth: { available: true } });
      }
      if (docStr.includes("QueryDictationAudioCapabilities")) {
        return Promise.resolve({ dictationAudioCapabilities: { isSupported: true, detectedPlatform: "macos", permissionsRequired: [] } });
      }
      if (docStr.includes("QueryObsidianDetect")) {
        return Promise.resolve({ obsidianDetect: { detected: [], searched: [] } });
      }
      if (docStr.includes("MutationDownloadModel")) {
        return Promise.resolve({ downloadModel: { downloadId: "dl-1", errors: [] } });
      }
      return Promise.resolve({});
    });

    renderOnboarding();
    await clickNext(2);

    await waitFor(() =>
      expect(screen.getByTestId("onboarding-models-download-all")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId("onboarding-models-download-all"));

    await waitFor(() =>
      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ catalogueId: "whisper-small-russian-bundle" }),
        })
      )
    );
  });

  it("Skip button marks onboarding as complete (task #14)", async () => {
    renderOnboarding();
    await clickNext(3);
    await waitFor(() => expect(screen.getByTestId("onboarding-skip")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("onboarding-skip"));

    await waitFor(() =>
      expect(window.localStorage.getItem("mozgoslav.onboardingComplete")).toBe("true")
    );
  });

  it("U1 — try-sample button navigates to queue without uploading", async () => {
    renderOnboarding();
    await clickNext(1);

    await waitFor(() =>
      expect(screen.getByTestId("onboarding-try-sample")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId("onboarding-try-sample"));

    await waitFor(() =>
      expect(mockedRequest).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ input: expect.objectContaining({ files: expect.anything() }) })
      )
    );
  });
});
