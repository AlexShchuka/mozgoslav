import type { Recording } from "../../models";

export interface RecordingListProps {
  recordings: Recording[];
  isLoading: boolean;
  isBackendUnavailable: boolean;
  error: string | null;
  onLoad: () => void;
}
