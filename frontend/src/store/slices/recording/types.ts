import type { Recording } from "../../../domain";

export interface RecordingState {
  recordings: Record<string, Recording>;
  isLoading: boolean;
  isBackendUnavailable: boolean;
  error: string | null;
  deletingIds: Record<string, true>;
}

export const initialRecordingState: RecordingState = {
  recordings: {},
  isLoading: false,
  isBackendUnavailable: false,
  error: null,
  deletingIds: {},
};
