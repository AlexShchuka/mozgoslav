import type { Reducer } from "redux";
import { DownloadState } from "../../../api/gql/graphql";
import {
  CANCEL_MODEL_DOWNLOAD_FAILURE,
  CANCEL_MODEL_DOWNLOAD_REQUESTED,
  CANCEL_MODEL_DOWNLOAD_SUCCESS,
  CLEAR_HIGHLIGHTED_DOWNLOAD,
  CLOSE_DOWNLOADS_DRAWER,
  DOWNLOAD_MODEL_REQUEST_FAILED,
  DOWNLOAD_MODEL_REQUESTED,
  DOWNLOAD_MODEL_STARTED,
  LOAD_ACTIVE_DOWNLOADS,
  LOAD_ACTIVE_DOWNLOADS_FAILURE,
  LOAD_ACTIVE_DOWNLOADS_SUCCESS,
  LOAD_MODELS,
  LOAD_MODELS_FAILURE,
  LOAD_MODELS_SUCCESS,
  MODEL_DOWNLOAD_COMPLETED,
  MODEL_DOWNLOAD_PROGRESS,
  OPEN_DOWNLOADS_DRAWER,
  SET_HIGHLIGHTED_DOWNLOAD,
  type ModelsAction,
} from "./actions";
import { initialModelsState, type ActiveDownload, type ModelsState } from "./types";

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

    case LOAD_ACTIVE_DOWNLOADS:
      return { ...state, isLoadingActiveDownloads: true };

    case LOAD_ACTIVE_DOWNLOADS_SUCCESS: {
      const incoming = (typed as { payload: ModelsState["activeDownloadList"] }).payload;
      const prevById = new Map(state.activeDownloadList.map((d) => [d.id, d]));
      const merged: ActiveDownload[] = incoming.map((next) => {
        const prev = prevById.get(next.id);
        if (!prev) return next;
        return {
          ...next,
          bytesReceived: Math.max(prev.bytesReceived, next.bytesReceived),
          totalBytes: next.totalBytes ?? prev.totalBytes,
          speedBytesPerSecond: prev.speedBytesPerSecond ?? next.speedBytesPerSecond,
        };
      });
      return {
        ...state,
        isLoadingActiveDownloads: false,
        activeDownloadList: merged,
      };
    }

    case LOAD_ACTIVE_DOWNLOADS_FAILURE:
      return { ...state, isLoadingActiveDownloads: false };

    case DOWNLOAD_MODEL_REQUESTED:
      return {
        ...state,
        requestingDownloadId: (typed as { payload: string }).payload,
      };

    case DOWNLOAD_MODEL_STARTED: {
      const { catalogueId, downloadId } = (
        typed as { payload: { catalogueId: string; downloadId: string } }
      ).payload;
      const withoutPriorTerminal = state.activeDownloadList.filter(
        (d) =>
          d.catalogueId !== catalogueId ||
          (d.state !== DownloadState.Failed &&
            d.state !== DownloadState.Cancelled &&
            d.state !== DownloadState.Completed)
      );
      const alreadyInList = withoutPriorTerminal.some((d) => d.id === downloadId);
      const optimistic: ActiveDownload = {
        id: downloadId,
        catalogueId,
        state: DownloadState.Queued,
        bytesReceived: 0,
        totalBytes: null,
        speedBytesPerSecond: null,
        errorMessage: null,
        startedAt: null,
      };
      return {
        ...state,
        requestingDownloadId: null,
        activeDownloads: { ...state.activeDownloads, [catalogueId]: downloadId },
        activeDownloadList: alreadyInList
          ? withoutPriorTerminal
          : [...withoutPriorTerminal, optimistic],
        isDownloadsDrawerOpen: true,
      };
    }

    case DOWNLOAD_MODEL_REQUEST_FAILED:
      return { ...state, requestingDownloadId: null };

    case CANCEL_MODEL_DOWNLOAD_REQUESTED:
      return { ...state, cancellingDownloadId: (typed as { payload: string }).payload };

    case CANCEL_MODEL_DOWNLOAD_SUCCESS:
    case CANCEL_MODEL_DOWNLOAD_FAILURE:
      return { ...state, cancellingDownloadId: null };

    case MODEL_DOWNLOAD_PROGRESS: {
      const { downloadId, bytesRead, totalBytes, phase, speedBytesPerSecond, error } = (
        typed as {
          payload: {
            downloadId: string;
            bytesRead: number;
            totalBytes: number | null;
            phase: ModelsState["downloadProgress"][string]["phase"];
            speedBytesPerSecond: number | null;
            error: string | null;
          };
        }
      ).payload;
      const activeDownloadList = state.activeDownloadList.map((d) =>
        d.id === downloadId
          ? {
              ...d,
              state: phase,
              bytesReceived: Math.max(d.bytesReceived, bytesRead),
              totalBytes: totalBytes ?? d.totalBytes,
              speedBytesPerSecond: speedBytesPerSecond ?? d.speedBytesPerSecond,
              errorMessage: error ?? d.errorMessage,
            }
          : d
      );
      return {
        ...state,
        downloadProgress: {
          ...state.downloadProgress,
          [downloadId]: { bytesRead, totalBytes, phase, speedBytesPerSecond, error },
        },
        activeDownloadList,
      };
    }

    case MODEL_DOWNLOAD_COMPLETED: {
      const downloadId = (typed as { payload: string }).payload;
      const { [downloadId]: _removed, ...restProgress } = state.downloadProgress;
      const activeDownloads = Object.fromEntries(
        Object.entries(state.activeDownloads).filter(([, dId]) => dId !== downloadId)
      );
      const activeDownloadList = state.activeDownloadList.filter((d) => d.id !== downloadId);
      return {
        ...state,
        downloadProgress: restProgress,
        activeDownloads,
        activeDownloadList,
      };
    }

    case OPEN_DOWNLOADS_DRAWER:
      return { ...state, isDownloadsDrawerOpen: true };

    case CLOSE_DOWNLOADS_DRAWER:
      return { ...state, isDownloadsDrawerOpen: false, highlightedDownloadId: null };

    case SET_HIGHLIGHTED_DOWNLOAD:
      return {
        ...state,
        highlightedDownloadId: (typed as { payload: string }).payload,
      };

    case CLEAR_HIGHLIGHTED_DOWNLOAD:
      return { ...state, highlightedDownloadId: null };

    default:
      return state;
  }
};
