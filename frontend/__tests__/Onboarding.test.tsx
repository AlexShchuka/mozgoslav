import {fireEvent, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

import Onboarding from "../src/features/Onboarding";
import {watchOnboardingSagas} from "../src/store/slices/onboarding";
import {type MockApiBundle, renderWithStore} from "../src/testUtils";
import {darkTheme} from "../src/styles/theme";
import "../src/i18n";

jest.mock("../src/api", () => {
    const actual = jest.requireActual("../src/api");
    const {
        createMockApi,
    } = jest.requireActual("../src/testUtils/mockApi") as typeof import("../src/testUtils/mockApi");
    const bundle = createMockApi();
    return {
        ...actual,
        apiFactory: bundle.factory,
        __bundle: bundle,
    };
});

const mockApi = (
    jest.requireMock("../src/api") as { __bundle: MockApiBundle }
).__bundle;

const renderOnboarding = () =>
    renderWithStore(
        <MemoryRouter>
            <Onboarding/>
        </MemoryRouter>,
        {sagas: [watchOnboardingSagas], theme: darkTheme},
    );

const clickNext = async (times: number): Promise<void> => {
    for (let i = 0; i < times; i++) {
        await waitFor(() =>
            expect(screen.getByTestId("onboarding-next")).not.toBeDisabled(),
        );
        fireEvent.click(screen.getByTestId("onboarding-next"));
    }
};

class StubEventSource {
    public onmessage: ((ev: MessageEvent) => void) | null = null;
    public onerror: ((ev: Event) => void) | null = null;

    public addEventListener(): void {
    }

    public removeEventListener(): void {
    }

    public close(): void {
    }
}

beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(navigator, "platform", {value: "MacIntel", configurable: true});
    (global as any).EventSource = StubEventSource;
    mockApi.healthApi.checkLlm.mockResolvedValue(true);
    mockApi.modelsApi.list.mockResolvedValue([]);
    mockApi.dictationApi.audioCapabilities.mockResolvedValue({
        isSupported: true,
        detectedPlatform: "macos",
        permissionsRequired: ["microphone"],
    });
    mockApi.obsidianApi.detect.mockResolvedValue({detected: [], searched: []});
});

describe("Onboarding — plan v0.8 Block 4 (slim, platform-aware)", () => {
    it("renders welcome step first (brand animation)", () => {
        renderOnboarding();
        expect(screen.getByTestId("onboarding-brand")).toBeInTheDocument();
    });

    it("renders eight step dots on macOS (task #12b adds models step)", async () => {
        Object.defineProperty(navigator, "platform", {value: "MacIntel", configurable: true});
        renderOnboarding();
        await waitFor(() => {
            const dots = screen.getAllByTestId("onboarding-dot");
            expect(dots.length).toBe(8);
        });
    });

    it("renders fewer step dots on Linux (no mic/dictation permission cards)", async () => {
        Object.defineProperty(navigator, "platform", {value: "Linux x86_64", configurable: true});
        renderOnboarding();
        await waitFor(() => {
            const dots = screen.getAllByTestId("onboarding-dot");
            expect(dots.length).toBe(6);
        });
    });

    it("Next is always enabled (every step is skippable via Next per plan §5)", async () => {
        renderOnboarding();
        await waitFor(() =>
            expect(screen.getByTestId("onboarding-next")).not.toBeDisabled(),
        );
    });

    it("writes onboardingComplete flag when user reaches the Ready step and clicks Apply", async () => {
        renderOnboarding();
        await clickNext(8);
        await waitFor(() =>
            expect(window.localStorage.getItem("mozgoslav.onboardingComplete")).toBe("true"),
        );
    });

    it("task #12b — models step lists Tier 1 bundle models with installed/missing status", async () => {
        mockApi.modelsApi.list.mockResolvedValue([
            {
                id: "whisper-small-russian-bundle",
                name: "Whisper Small",
                description: "Bundled STT",
                url: "https://example/whisper-small.bin",
                sizeMb: 260,
                kind: "Stt",
                tier: "bundle",
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
                kind: "Vad",
                tier: "bundle",
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
                kind: "Stt",
                tier: "downloadable",
                isDefault: true,
                destinationPath: "/models/antony66.bin",
                installed: false,
            },
        ]);

        renderOnboarding();

        await clickNext(2);

        await waitFor(() =>
            expect(screen.getByTestId("onboarding-models-item-whisper-small-russian-bundle"))
                .toBeInTheDocument(),
        );

        expect(screen.getByTestId("onboarding-models-item-silero-vad")).toBeInTheDocument();

        expect(
            screen.queryByTestId("onboarding-models-item-whisper-large-v3-russian-antony66"),
        ).toBeNull();

        expect(screen.getByTestId("onboarding-models-download-all")).toBeInTheDocument();
        expect(screen.getByTestId("onboarding-next")).toBeDisabled();
    });

    it("task #12b — Next is enabled on models step only when every Tier 1 model is installed", async () => {
        mockApi.modelsApi.list.mockResolvedValue([
            {
                id: "whisper-small-russian-bundle",
                name: "Whisper Small",
                description: "Bundled STT",
                url: "https://example/whisper-small.bin",
                sizeMb: 260,
                kind: "Stt",
                tier: "bundle",
                isDefault: false,
                destinationPath: "/models/ggml-small-q8_0.bin",
                installed: true,
            },
            {
                id: "silero-vad",
                name: "Silero VAD",
                description: "Bundled VAD",
                url: "https://example/silero.bin",
                sizeMb: 4,
                kind: "Vad",
                tier: "bundle",
                isDefault: true,
                destinationPath: "/models/ggml-silero-v6.2.0.bin",
                installed: true,
            },
        ]);

        renderOnboarding();
        await clickNext(2);

        await waitFor(() =>
            expect(screen.getByTestId("onboarding-next")).not.toBeDisabled(),
        );
        expect(screen.queryByTestId("onboarding-models-download-all")).toBeNull();
    });

    it("task #12b — Скачать всё triggers modelsApi.download for every missing Tier 1 model", async () => {
        mockApi.modelsApi.list.mockResolvedValue([
            {
                id: "whisper-small-russian-bundle",
                name: "Whisper Small",
                description: "Bundled STT",
                url: "u1",
                sizeMb: 260,
                kind: "Stt",
                tier: "bundle",
                isDefault: false,
                destinationPath: "/models/ggml-small-q8_0.bin",
                installed: false,
            },
            {
                id: "silero-vad",
                name: "Silero VAD",
                description: "Bundled VAD",
                url: "u2",
                sizeMb: 4,
                kind: "Vad",
                tier: "bundle",
                isDefault: true,
                destinationPath: "/models/ggml-silero-v6.2.0.bin",
                installed: false,
            },
        ]);
        mockApi.modelsApi.download.mockResolvedValue({downloadId: "dl-1"});

        renderOnboarding();
        await clickNext(2);

        await waitFor(() =>
            expect(screen.getByTestId("onboarding-models-download-all")).toBeInTheDocument(),
        );
        fireEvent.click(screen.getByTestId("onboarding-models-download-all"));

        await waitFor(() =>
            expect(mockApi.modelsApi.download).toHaveBeenCalledWith("whisper-small-russian-bundle"),
        );
    });

    it("Skip button marks onboarding as complete (task #14)", async () => {
        renderOnboarding();
        await clickNext(3);
        await waitFor(() =>
            expect(screen.getByTestId("onboarding-skip")).toBeInTheDocument(),
        );

        fireEvent.click(screen.getByTestId("onboarding-skip"));

        await waitFor(() =>
            expect(window.localStorage.getItem("mozgoslav.onboardingComplete")).toBe("true"),
        );
    });

    it("U1 — try-sample button uploads the bundled WAV via recordingApi.upload", async () => {
        const wavBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
        const blob = new Blob([wavBytes], {type: "audio/wav"});
        const originalFetch = (global as any).fetch;
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            blob: () => Promise.resolve(blob),
        });
        (global as any).fetch = fetchMock;
        mockApi.recordingApi.upload.mockResolvedValue([]);

        try {
            renderOnboarding();
            await clickNext(1);

            await waitFor(() =>
                expect(screen.getByTestId("onboarding-try-sample")).toBeInTheDocument(),
            );
            fireEvent.click(screen.getByTestId("onboarding-try-sample"));

            await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/sample.wav"));
            await waitFor(() =>
                expect(mockApi.recordingApi.upload).toHaveBeenCalledTimes(1),
            );
        } finally {
            (global as any).fetch = originalFetch;
        }
    });
});
