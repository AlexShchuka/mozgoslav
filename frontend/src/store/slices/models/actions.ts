import type { DownloadState } from "../../../api/gql/graphql";
import type { ModelEntry, ModelDownloadProgress, ActiveDownload } from "./types";

export const LOAD_MODELS = "models/LOAD_MODELS";
export const LOAD_MODELS_SUCCESS = "models/LOAD_MODELS_SUCCESS";
export const LOAD_MODELS_FAILURE = "models/LOAD_MODELS_FAILURE";

export const LOAD_ACTIVE_DOWNLOADS = "models/LOAD_ACTIVE_DOWNLOADS";
export const LOAD_ACTIVE_DOWNLOADS_SUCCESS = "models/LOAD_ACTIVE_DOWNLOADS_SUCCESS";
export const LOAD_ACTIVE_DOWNLOADS_FAILURE = "models/LOAD_ACTIVE_DOWNLOADS_FAILURE";

export const DOWNLOAD_MODEL_REQUESTED = "models/DOWNLOAD_MODEL_REQUESTED";
export const DOWNLOAD_MODEL_STARTED = "models/DOWNLOAD_MODEL_STARTED";
export const DOWNLOAD_MODEL_REQUEST_FAILED = "models/DOWNLOAD_MODEL_REQUEST_FAILED";

export const CANCEL_MODEL_DOWNLOAD_REQUESTED = "models/CANCEL_MODEL_DOWNLOAD_REQUESTED";
export const CANCEL_MODEL_DOWNLOAD_SUCCESS = "models/CANCEL_MODEL_DOWNLOAD_SUCCESS";
export const CANCEL_MODEL_DOWNLOAD_FAILURE = "models/CANCEL_MODEL_DOWNLOAD_FAILURE";

export const SUBSCRIBE_MODEL_DOWNLOAD = "models/SUBSCRIBE_MODEL_DOWNLOAD";
export const UNSUBSCRIBE_MODEL_DOWNLOAD = "models/UNSUBSCRIBE_MODEL_DOWNLOAD";

export const MODEL_DOWNLOAD_PROGRESS = "models/MODEL_DOWNLOAD_PROGRESS";
export const MODEL_DOWNLOAD_COMPLETED = "models/MODEL_DOWNLOAD_COMPLETED";

export const OPEN_DOWNLOADS_DRAWER = "models/OPEN_DOWNLOADS_DRAWER";
export const CLOSE_DOWNLOADS_DRAWER = "models/CLOSE_DOWNLOADS_DRAWER";

export const SET_HIGHLIGHTED_DOWNLOAD = "models/SET_HIGHLIGHTED_DOWNLOAD";
export const CLEAR_HIGHLIGHTED_DOWNLOAD = "models/CLEAR_HIGHLIGHTED_DOWNLOAD";

export interface LoadModelsAction {
  type: typeof LOAD_MODELS;
}

export interface LoadModelsSuccessAction {
  type: typeof LOAD_MODELS_SUCCESS;
  payload: ModelEntry[];
}

export interface LoadModelsFailureAction {
  type: typeof LOAD_MODELS_FAILURE;
  payload: string;
}

export interface LoadActiveDownloadsAction {
  type: typeof LOAD_ACTIVE_DOWNLOADS;
}

export interface LoadActiveDownloadsSuccessAction {
  type: typeof LOAD_ACTIVE_DOWNLOADS_SUCCESS;
  payload: ActiveDownload[];
}

export interface LoadActiveDownloadsFailureAction {
  type: typeof LOAD_ACTIVE_DOWNLOADS_FAILURE;
  payload: string;
}

export interface DownloadModelRequestedAction {
  type: typeof DOWNLOAD_MODEL_REQUESTED;
  payload: string;
}

export interface DownloadModelStartedAction {
  type: typeof DOWNLOAD_MODEL_STARTED;
  payload: { catalogueId: string; downloadId: string };
}

export interface DownloadModelRequestFailedAction {
  type: typeof DOWNLOAD_MODEL_REQUEST_FAILED;
  payload: { catalogueId: string; error: string };
}

export interface CancelModelDownloadRequestedAction {
  type: typeof CANCEL_MODEL_DOWNLOAD_REQUESTED;
  payload: string;
}

export interface CancelModelDownloadSuccessAction {
  type: typeof CANCEL_MODEL_DOWNLOAD_SUCCESS;
  payload: string;
}

export interface CancelModelDownloadFailureAction {
  type: typeof CANCEL_MODEL_DOWNLOAD_FAILURE;
  payload: { downloadId: string; error: string };
}

export interface SubscribeModelDownloadAction {
  type: typeof SUBSCRIBE_MODEL_DOWNLOAD;
  payload: { downloadId: string };
}

export interface UnsubscribeModelDownloadAction {
  type: typeof UNSUBSCRIBE_MODEL_DOWNLOAD;
  payload: { downloadId: string };
}

export interface ModelDownloadProgressAction {
  type: typeof MODEL_DOWNLOAD_PROGRESS;
  payload: { downloadId: string } & ModelDownloadProgress;
}

export interface ModelDownloadCompletedAction {
  type: typeof MODEL_DOWNLOAD_COMPLETED;
  payload: string;
}

export interface OpenDownloadsDrawerAction {
  type: typeof OPEN_DOWNLOADS_DRAWER;
}

export interface CloseDownloadsDrawerAction {
  type: typeof CLOSE_DOWNLOADS_DRAWER;
}

export interface SetHighlightedDownloadAction {
  type: typeof SET_HIGHLIGHTED_DOWNLOAD;
  payload: string;
}

export interface ClearHighlightedDownloadAction {
  type: typeof CLEAR_HIGHLIGHTED_DOWNLOAD;
}

export type ModelsAction =
  | LoadModelsAction
  | LoadModelsSuccessAction
  | LoadModelsFailureAction
  | LoadActiveDownloadsAction
  | LoadActiveDownloadsSuccessAction
  | LoadActiveDownloadsFailureAction
  | DownloadModelRequestedAction
  | DownloadModelStartedAction
  | DownloadModelRequestFailedAction
  | CancelModelDownloadRequestedAction
  | CancelModelDownloadSuccessAction
  | CancelModelDownloadFailureAction
  | SubscribeModelDownloadAction
  | UnsubscribeModelDownloadAction
  | ModelDownloadProgressAction
  | ModelDownloadCompletedAction
  | OpenDownloadsDrawerAction
  | CloseDownloadsDrawerAction
  | SetHighlightedDownloadAction
  | ClearHighlightedDownloadAction;

export const loadModels = (): LoadModelsAction => ({ type: LOAD_MODELS });

export const loadModelsSuccess = (models: ModelEntry[]): LoadModelsSuccessAction => ({
  type: LOAD_MODELS_SUCCESS,
  payload: models,
});

export const loadModelsFailure = (error: string): LoadModelsFailureAction => ({
  type: LOAD_MODELS_FAILURE,
  payload: error,
});

export const loadActiveDownloads = (): LoadActiveDownloadsAction => ({
  type: LOAD_ACTIVE_DOWNLOADS,
});

export const loadActiveDownloadsSuccess = (
  downloads: ActiveDownload[]
): LoadActiveDownloadsSuccessAction => ({
  type: LOAD_ACTIVE_DOWNLOADS_SUCCESS,
  payload: downloads,
});

export const loadActiveDownloadsFailure = (error: string): LoadActiveDownloadsFailureAction => ({
  type: LOAD_ACTIVE_DOWNLOADS_FAILURE,
  payload: error,
});

export const downloadModel = (catalogueId: string): DownloadModelRequestedAction => ({
  type: DOWNLOAD_MODEL_REQUESTED,
  payload: catalogueId,
});

export const downloadModelStarted = (payload: {
  catalogueId: string;
  downloadId: string;
}): DownloadModelStartedAction => ({
  type: DOWNLOAD_MODEL_STARTED,
  payload,
});

export const downloadModelRequestFailed = (payload: {
  catalogueId: string;
  error: string;
}): DownloadModelRequestFailedAction => ({
  type: DOWNLOAD_MODEL_REQUEST_FAILED,
  payload,
});

export const cancelModelDownload = (downloadId: string): CancelModelDownloadRequestedAction => ({
  type: CANCEL_MODEL_DOWNLOAD_REQUESTED,
  payload: downloadId,
});

export const cancelModelDownloadSuccess = (
  downloadId: string
): CancelModelDownloadSuccessAction => ({
  type: CANCEL_MODEL_DOWNLOAD_SUCCESS,
  payload: downloadId,
});

export const cancelModelDownloadFailure = (payload: {
  downloadId: string;
  error: string;
}): CancelModelDownloadFailureAction => ({
  type: CANCEL_MODEL_DOWNLOAD_FAILURE,
  payload,
});

export const subscribeModelDownload = (downloadId: string): SubscribeModelDownloadAction => ({
  type: SUBSCRIBE_MODEL_DOWNLOAD,
  payload: { downloadId },
});

export const unsubscribeModelDownload = (downloadId: string): UnsubscribeModelDownloadAction => ({
  type: UNSUBSCRIBE_MODEL_DOWNLOAD,
  payload: { downloadId },
});

export const modelDownloadProgress = (
  payload: { downloadId: string } & ModelDownloadProgress
): ModelDownloadProgressAction => ({
  type: MODEL_DOWNLOAD_PROGRESS,
  payload,
});

export const modelDownloadCompleted = (downloadId: string): ModelDownloadCompletedAction => ({
  type: MODEL_DOWNLOAD_COMPLETED,
  payload: downloadId,
});

export const openDownloadsDrawer = (): OpenDownloadsDrawerAction => ({
  type: OPEN_DOWNLOADS_DRAWER,
});

export const closeDownloadsDrawer = (): CloseDownloadsDrawerAction => ({
  type: CLOSE_DOWNLOADS_DRAWER,
});

export const setHighlightedDownload = (downloadId: string): SetHighlightedDownloadAction => ({
  type: SET_HIGHLIGHTED_DOWNLOAD,
  payload: downloadId,
});

export const clearHighlightedDownload = (): ClearHighlightedDownloadAction => ({
  type: CLEAR_HIGHLIGHTED_DOWNLOAD,
});

export type { DownloadState };
