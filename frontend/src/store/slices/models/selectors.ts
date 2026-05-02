import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { ModelsState, ModelDownloadProgress, ActiveDownload } from "./types";

const selectModelsState = (state: GlobalState): ModelsState => state.models;

export const selectAllModels = createSelector(selectModelsState, (slice) =>
  Object.values(slice.byId)
);

export const selectModelsLoading = createSelector(selectModelsState, (slice) => slice.isLoading);

export const selectDownloadingModelId = createSelector(
  selectModelsState,
  (slice) => slice.requestingDownloadId
);

export const selectCancellingDownloadId = createSelector(
  selectModelsState,
  (slice) => slice.cancellingDownloadId
);

export const selectActiveDownloads = createSelector(
  selectModelsState,
  (slice): Record<string, string> => slice.activeDownloads
);

export const selectActiveDownloadList = createSelector(
  selectModelsState,
  (slice): ActiveDownload[] => slice.activeDownloadList
);

export const selectActiveDownloadIdForModel = (catalogueId: string) =>
  createSelector(
    selectModelsState,
    (slice): string | null => slice.activeDownloads[catalogueId] ?? null
  );

export const selectDownloadProgress = (downloadId: string) =>
  createSelector(
    selectModelsState,
    (slice): ModelDownloadProgress | null => slice.downloadProgress[downloadId] ?? null
  );

export const selectIsDownloadsDrawerOpen = createSelector(
  selectModelsState,
  (slice): boolean => slice.isDownloadsDrawerOpen
);

export const selectActiveDownloadCount = createSelector(
  selectActiveDownloadList,
  (list): number => list.length
);

export const selectHighlightedDownloadId = createSelector(
  selectModelsState,
  (slice): string | null => slice.highlightedDownloadId
);
