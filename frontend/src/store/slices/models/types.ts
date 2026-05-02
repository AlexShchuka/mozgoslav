import type { QueryModelsQuery, DownloadState } from "../../../api/gql/graphql";

export type ModelEntry = QueryModelsQuery["models"][number];

export interface ModelDownloadProgress {
  readonly bytesRead: number;
  readonly totalBytes: number | null;
  readonly phase: DownloadState;
  readonly speedBytesPerSecond: number | null;
  readonly error: string | null;
}

export interface ActiveDownload {
  readonly id: string;
  readonly catalogueId: string;
  readonly state: DownloadState;
  readonly bytesReceived: number;
  readonly totalBytes: number | null;
  readonly speedBytesPerSecond: number | null;
  readonly errorMessage: string | null;
  readonly startedAt: string | null;
}

export interface ModelsState {
  readonly byId: Record<string, ModelEntry>;
  readonly isLoading: boolean;
  readonly isLoadingActiveDownloads: boolean;
  readonly requestingDownloadId: string | null;
  readonly cancellingDownloadId: string | null;
  readonly activeDownloads: Record<string, string>;
  readonly activeDownloadList: ActiveDownload[];
  readonly downloadProgress: Record<string, ModelDownloadProgress>;
  readonly isDownloadsDrawerOpen: boolean;
  readonly highlightedDownloadId: string | null;
}

export const initialModelsState: ModelsState = {
  byId: {},
  isLoading: false,
  isLoadingActiveDownloads: false,
  requestingDownloadId: null,
  cancellingDownloadId: null,
  activeDownloads: {},
  activeDownloadList: [],
  downloadProgress: {},
  isDownloadsDrawerOpen: false,
  highlightedDownloadId: null,
};
