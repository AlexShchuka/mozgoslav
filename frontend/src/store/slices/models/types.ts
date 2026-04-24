import type { QueryModelsQuery } from "../../../api/gql/graphql";

export type ModelEntry = QueryModelsQuery["models"][number];

export interface ModelDownloadProgress {
  readonly bytesRead: number;
  readonly totalBytes: number | null;
  readonly done: boolean;
  readonly error: string | null;
}

export interface ModelsState {
  readonly byId: Record<string, ModelEntry>;
  readonly isLoading: boolean;
  readonly requestingDownloadId: string | null;
  readonly activeDownloads: Record<string, string>;
  readonly downloadProgress: Record<string, ModelDownloadProgress>;
}

export const initialModelsState: ModelsState = {
  byId: {},
  isLoading: false,
  requestingDownloadId: null,
  activeDownloads: {},
  downloadProgress: {},
};
