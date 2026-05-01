import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import type { JobStatus, ProcessingJob } from "../../../domain";
import { getJobStatusText, getLiveRecordingStatusText } from "../recordingStatusText";

const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: "en",
  resources: {
    en: {
      translation: {
        "pipeline.status.Queued": "Queued",
        "pipeline.status.PreflightChecks": "Pre-flight checks…",
        "pipeline.status.Transcribing": "Transcribing…",
        "pipeline.status.Correcting": "Cleaning transcript…",
        "pipeline.status.Summarizing": "Summarizing…",
        "pipeline.status.Exporting": "Exporting…",
        "pipeline.status.Done": "Done",
        "pipeline.status.Failed": "Error",
        "pipeline.status.Cancelled": "Cancelled",
        "pipeline.status.Paused": "Paused",
        "home.liveTranscriptWaiting": "Listening…",
      },
    },
  },
});

const t = testI18n.t.bind(testI18n);

const makeJob = (status: JobStatus, overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: "job-1",
  recordingId: "rec-1",
  profileId: "prof-1",
  status,
  progress: 0,
  currentStep: null,
  errorMessage: null,
  userHint: null,
  createdAt: "2026-04-19T20:00:00Z",
  startedAt: null,
  finishedAt: null,
  ...overrides,
});

const STATUS_CASES: Array<[JobStatus, string]> = [
  ["Queued", "Queued"],
  ["PreflightChecks", "Pre-flight checks…"],
  ["Transcribing", "Transcribing…"],
  ["Correcting", "Cleaning transcript…"],
  ["Summarizing", "Summarizing…"],
  ["Exporting", "Exporting…"],
  ["Done", "Done"],
  ["Failed", "Error"],
  ["Cancelled", "Cancelled"],
  ["Paused", "Paused"],
];

describe("getJobStatusText", () => {
  it.each(STATUS_CASES)("status=%s renders '%s'", (status, expected) => {
    expect(getJobStatusText(makeJob(status), t)).toBe(expected);
  });

  it("Failed with userHint shows userHint, not generic error key", () => {
    const job = makeJob("Failed", { userHint: "Whisper model missing. Settings → Models" });
    expect(getJobStatusText(job, t)).toBe("Whisper model missing. Settings → Models");
  });

  it("Transcribing MUST NOT return liveTranscriptWaiting text", () => {
    const listeningText = getLiveRecordingStatusText(t);
    const transcribingText = getJobStatusText(makeJob("Transcribing"), t);
    expect(transcribingText).not.toBe(listeningText);
  });
});

describe("getLiveRecordingStatusText", () => {
  it("returns liveTranscriptWaiting key value when no job exists", () => {
    expect(getLiveRecordingStatusText(t)).toBe("Listening…");
  });
});
