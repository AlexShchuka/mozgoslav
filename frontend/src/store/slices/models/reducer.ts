import type { Reducer } from "redux";
import {
  DOWNLOAD_MODEL_REQUEST_FAILED,
  DOWNLOAD_MODEL_REQUESTED,
  DOWNLOAD_MODEL_STARTED,
  LOAD_MODELS,
  LOAD_MODELS_FAILURE,
  LOAD_MODELS_SUCCESS,
  MODEL_DOWNLOAD_COMPLETED,
  MODEL_DOWNLOAD_PROGRESS,
  type ModelsAction,
} from "./actions";
import { initialModelsState, type ModelsState } from "./types";

export const modelsReducer: Reducer<ModelsState> = (
  state: ModelsState = initialModelsState,
  action
): ModelsState => {
  const typed = action as ModelsAction;
  switch (typed.type) {
    case LOAD_MODELS:
      return { ...state, isLoading: true };

    case LOAD_MODELS_SUCCESS: {
      const models = (typed as { payload: ModelsState["byId"][string][] }).payload;
      const byId = models.reduce<ModelsState["byId"]>((acc, model) => {
        acc[model.id] = model;
        return acc;
      }, {});
      return { ...state, isLoading: false, byId };
    }

    case LOAD_MODELS_FAILURE:
      return { ...state, isLoading: false };

    case DOWNLOAD_MODEL_REQUESTED:
      return {
        ...state,
        requestingDownloadId: (typed as { payload: string }).payload,
      };

    case DOWNLOAD_MODEL_STARTED: {
      const { catalogueId, downloadId } = (
        typed as { payload: { catalogueId: string; downloadId: string } }
      ).payload;
      return {
        ...state,
        requestingDownloadId: null,
        activeDownloads: { ...state.activeDownloads, [catalogueId]: downloadId },
      };
    }

    case DOWNLOAD_MODEL_REQUEST_FAILED:
      return { ...state, requestingDownloadId: null };

    case MODEL_DOWNLOAD_PROGRESS: {
      const { downloadId, bytesRead, totalBytes, done, error } = (
        typed as {
          payload: {
            downloadId: string;
            bytesRead: number;
            totalBytes: number | null;
            done: boolean;
            error: string | null;
          };
        }
      ).payload;
      return {
        ...state,
        downloadProgress: {
          ...state.downloadProgress,
          [downloadId]: { bytesRead, totalBytes, done, error },
        },
      };
    }

    case MODEL_DOWNLOAD_COMPLETED: {
      const downloadId = (typed as { payload: string }).payload;
      const { [downloadId]: _removed, ...restProgress } = state.downloadProgress;
      const activeDownloads = Object.fromEntries(
        Object.entries(state.activeDownloads).filter(([, dId]) => dId !== downloadId)
      );
      return { ...state, downloadProgress: restProgress, activeDownloads };
    }

    default:
      return state;
  }
};
