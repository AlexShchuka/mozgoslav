import {render, screen} from "@testing-library/react";
import RecordingList from "../src/features/RecordingList/RecordingList";
import type {Recording} from "../src/domain";

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

describe("RecordingList", () => {
    it("renders the empty state when there are no recordings", () => {
        const onLoad = jest.fn();
        render(
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
        render(
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
        render(
            <RecordingList
                recordings={[buildRecording({id: "1", fileName: "meeting.m4a"})]}
                isLoading={false}
                isBackendUnavailable={false}
                error={null}
                onLoad={jest.fn()}
            />
        );

        expect(screen.getByText("meeting.m4a")).toBeInTheDocument();
        expect(screen.getByText(/2:15 · Transcribed/)).toBeInTheDocument();
    });
});
