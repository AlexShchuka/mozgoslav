import type { ActiveDownload } from "../../store/slices/models/types";

export interface DownloadsDrawerProps {
  isOpen: boolean;
  downloads: ActiveDownload[];
  cancellingDownloadId: string | null;
  highlightedDownloadId?: string | null;
  onClose: () => void;
  onCancel: (downloadId: string) => void;
  onRetry: (catalogueId: string) => void;
}
