import type { AnyAction } from "redux";
import type { RecordingState } from "../types";
import { recordingReducer } from "../reducer";
import { initialRecordingState } from "../types";
import { liveTranscriptPartial, liveTranscriptCleared } from "../actions";

const reduce = (state: RecordingState, action: AnyAction): RecordingState =>
  recordingReducer(state, action);

describe("recordingReducer — live transcript", () => {
  it("LIVE_TRANSCRIPT_PARTIAL writes the entry for the given recordingId", () => {
    const state = reduce(
      initialRecordingState,
      liveTranscriptPartial({
        recordingId: "rec-1",
        text: "hello",
        observedAt: "2024-01-01T00:00:00Z",
      })
    );
    expect(state.livePartials["rec-1"]).toEqual({
      text: "hello",
      observedAt: "2024-01-01T00:00:00Z",
    });
  });

  it("LIVE_TRANSCRIPT_PARTIAL overwrites previous entry for same recordingId", () => {
    const after1 = reduce(
      initialRecordingState,
      liveTranscriptPartial({
        recordingId: "rec-1",
        text: "first",
        observedAt: "2024-01-01T00:00:00Z",
      })
    );
    const after2 = reduce(
      after1,
      liveTranscriptPartial({
        recordingId: "rec-1",
        text: "second",
        observedAt: "2024-01-01T00:00:01Z",
      })
    );
    expect(after2.livePartials["rec-1"]?.text).toBe("second");
  });

  it("LIVE_TRANSCRIPT_CLEARED removes entry for the given recordingId", () => {
    const withPartial = reduce(
      initialRecordingState,
      liveTranscriptPartial({
        recordingId: "rec-1",
        text: "hello",
        observedAt: "2024-01-01T00:00:00Z",
      })
    );
    const cleared = reduce(withPartial, liveTranscriptCleared("rec-1"));
    expect(cleared.livePartials["rec-1"]).toBeUndefined();
  });

  it("multiple recordingIds coexist independently", () => {
    const s1 = reduce(
      initialRecordingState,
      liveTranscriptPartial({
        recordingId: "rec-1",
        text: "aaa",
        observedAt: "2024-01-01T00:00:00Z",
      })
    );
    const s2 = reduce(
      s1,
      liveTranscriptPartial({
        recordingId: "rec-2",
        text: "bbb",
        observedAt: "2024-01-01T00:00:00Z",
      })
    );

    expect(s2.livePartials["rec-1"]?.text).toBe("aaa");
    expect(s2.livePartials["rec-2"]?.text).toBe("bbb");

    const s3 = reduce(s2, liveTranscriptCleared("rec-1"));
    expect(s3.livePartials["rec-1"]).toBeUndefined();
    expect(s3.livePartials["rec-2"]?.text).toBe("bbb");
  });

  it("LIVE_TRANSCRIPT_CLEARED on unknown recordingId does not modify state", () => {
    const state = reduce(initialRecordingState, liveTranscriptCleared("unknown"));
    expect(state.livePartials).toEqual({});
  });
});
