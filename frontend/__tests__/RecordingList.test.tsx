import {render, screen} from "@testing-library/react";
import {ThemeProvider} from "styled-components";

import RecordingList from "../src/features/RecordingList/RecordingList";
import type {Recording} from "../src/domain";
import {lightTheme} from "../src/styles/theme";

const buildRecording = (overrides: Partial<Recording> = {}): Recording => ({
    id: "1",
    fileName: "meeting.m4a",
    filePath: "/tmp/meeting.m4a",
    sha256: "abc",
    duration: "135",
    format: "M4A",
    sourceType: "Imported",
    status: "Transcribed",
    createdAt: new Date("2026-04-16T12:00:00Z").toISOString(),
    ...overrides,
});

const renderWithTheme = (ui: React.ReactElement) =>
    render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe("RecordingList", () => {
    it("renders the empty state when there are no recordings", () => {
        const onLoad = jest.fn();
        renderWithTheme(
            <RecordingList
                recordings={[]}
                isLoading={false}
                isBackendUnavailable={false}
                error={null}
                onLoad={onLoad}
            />
        );

        expect(screen.getByTestId("recording-empty")).toBeInTheDocument();
        expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it("renders the backend-unavailable banner when backend is down", () => {
        renderWithTheme(
            <RecordingList
                recordings={[]}
                isLoading={false}
                isBackendUnavailable={true}
                error={null}
                onLoad={jest.fn()}
            />
        );

        expect(screen.getByTestId("recording-empty-backend")).toHaveTextContent(
            "Бэкенд не отвечает. Запусти backend."
        );
    });

    it("renders recordings when provided", () => {
        renderWithTheme(
            <RecordingList
                recordings={[buildRecording({id: "1", fileName: "meeting.m4a"})]}
                isLoading={false}
                isBackendUnavailable={false}
                error={null}
                onLoad={jest.fn()}
            />
        );

        expect(screen.getByText("meeting.m4a")).toBeInTheDocument();
        expect(screen.getByText(/2:15/)).toBeInTheDocument();
        expect(screen.getByText(/Transcribed/)).toBeInTheDocument();
    });
});
