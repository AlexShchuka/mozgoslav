import type { ModelEntry, ModelDownloadProgress } from "./types";

export const LOAD_MODELS = "models/LOAD_MODELS";
export const LOAD_MODELS_SUCCESS = "models/LOAD_MODELS_SUCCESS";
export const LOAD_MODELS_FAILURE = "models/LOAD_MODELS_FAILURE";

export const DOWNLOAD_MODEL_REQUESTED = "models/DOWNLOAD_MODEL_REQUESTED";
export const DOWNLOAD_MODEL_STARTED = "models/DOWNLOAD_MODEL_STARTED";
export const DOWNLOAD_MODEL_REQUEST_FAILED = "models/DOWNLOAD_MODEL_REQUEST_FAILED";

export const SUBSCRIBE_MODEL_DOWNLOAD = "models/SUBSCRIBE_MODEL_DOWNLOAD";
export const UNSUBSCRIBE_MODEL_DOWNLOAD = "models/UNSUBSCRIBE_MODEL_DOWNLOAD";

export const MODEL_DOWNLOAD_PROGRESS = "models/MODEL_DOWNLOAD_PROGRESS";
export const MODEL_DOWNLOAD_COMPLETED = "models/MODEL_DOWNLOAD_COMPLETED";

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

export type ModelsAction =
  | LoadModelsAction
  | LoadModelsSuccessAction
  | LoadModelsFailureAction
  | DownloadModelRequestedAction
  | DownloadModelStartedAction
  | DownloadModelRequestFailedAction
  | SubscribeModelDownloadAction
  | UnsubscribeModelDownloadAction
  | ModelDownloadProgressAction
  | ModelDownloadCompletedAction;

export const loadModels = (): LoadModelsAction => ({ type: LOAD_MODELS });

export const loadModelsSuccess = (models: ModelEntry[]): LoadModelsSuccessAction => ({
  type: LOAD_MODELS_SUCCESS,
  payload: models,
});

export const loadModelsFailure = (error: string): LoadModelsFailureAction => ({
  type: LOAD_MODELS_FAILURE,
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
