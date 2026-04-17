import type { Recording } from "../../domain";

export interface RecordingListProps {
  recordings: Recording[];
  isLoading: boolean;
  isBackendUnavailable: boolean;
  error: string | null;
  onLoad: () => void;
}
