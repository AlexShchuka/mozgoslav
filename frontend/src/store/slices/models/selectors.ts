import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { ModelsState, ModelDownloadProgress } from "./types";

const selectModelsState = (state: GlobalState): ModelsState => state.models;

export const selectAllModels = createSelector(selectModelsState, (slice) =>
  Object.values(slice.byId)
);

export const selectModelsLoading = createSelector(selectModelsState, (slice) => slice.isLoading);

export const selectDownloadingModelId = createSelector(
  selectModelsState,
  (slice) => slice.requestingDownloadId
);

export const selectActiveDownloads = createSelector(
  selectModelsState,
  (slice): Record<string, string> => slice.activeDownloads
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
