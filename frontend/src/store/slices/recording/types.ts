import type { Recording } from "../../../domain";

export interface LivePartialEntry {
  text: string;
  observedAt: string;
}

export interface RecordingState {
  recordings: Record<string, Recording>;
  isLoading: boolean;
  isBackendUnavailable: boolean;
  error: string | null;
  deletingIds: Record<string, true>;
  isUploading: boolean;
  lastUploadError: string | null;
  livePartials: Record<string, LivePartialEntry>;
}

export const initialRecordingState: RecordingState = {
  recordings: {},
  isLoading: false,
  isBackendUnavailable: false,
  error: null,
  deletingIds: {},
  isUploading: false,
  lastUploadError: null,
  livePartials: {},
};
