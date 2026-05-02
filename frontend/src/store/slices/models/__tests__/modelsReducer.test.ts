import { DownloadState } from "../../../../api/gql/graphql";
import {
  CANCEL_MODEL_DOWNLOAD_REQUESTED,
  CANCEL_MODEL_DOWNLOAD_SUCCESS,
  CLOSE_DOWNLOADS_DRAWER,
  DOWNLOAD_MODEL_REQUEST_FAILED,
  DOWNLOAD_MODEL_REQUESTED,
  DOWNLOAD_MODEL_STARTED,
  LOAD_ACTIVE_DOWNLOADS,
  LOAD_ACTIVE_DOWNLOADS_SUCCESS,
  LOAD_MODELS,
  LOAD_MODELS_SUCCESS,
  MODEL_DOWNLOAD_COMPLETED,
  MODEL_DOWNLOAD_PROGRESS,
  OPEN_DOWNLOADS_DRAWER,
} from "../actions";
import { modelsReducer } from "../reducer";
import { initialModelsState } from "../types";

describe("modelsReducer — TC-F01..F06", () => {
  it("TC-F01: LOAD_MODELS sets isLoading=true", () => {
    const state = modelsReducer(initialModelsState, { type: LOAD_MODELS });
    expect(state.isLoading).toBe(true);
  });

  it("TC-F02: LOAD_MODELS_SUCCESS populates byId and clears isLoading", () => {
    const model = {
      __typename: "ModelEntry" as const,
      id: "m1",
      name: "M1",
      description: null,
      url: "u",
      sizeMb: 100,
      kind: "STT" as const,
      tier: "OPTIONAL" as const,
      isDefault: false,
      destinationPath: "/m/m1.bin",
      installed: false,
    };
    const state = modelsReducer(initialModelsState, {
      type: LOAD_MODELS_SUCCESS,
      payload: [model],
    });
    expect(state.isLoading).toBe(false);
    expect(state.byId["m1"]).toEqual(model);
  });

  it("TC-F03: DOWNLOAD_MODEL_REQUESTED sets requestingDownloadId", () => {
    const state = modelsReducer(initialModelsState, {
      type: DOWNLOAD_MODEL_REQUESTED,
      payload: "cat-1",
    });
    expect(state.requestingDownloadId).toBe("cat-1");
  });

  it("TC-F04: DOWNLOAD_MODEL_STARTED clears requesting and records active download", () => {
    const withRequesting = { ...initialModelsState, requestingDownloadId: "cat-1" };
    const state = modelsReducer(withRequesting, {
      type: DOWNLOAD_MODEL_STARTED,
      payload: { catalogueId: "cat-1", downloadId: "dl-abc" },
    });
    expect(state.requestingDownloadId).toBeNull();
    expect(state.activeDownloads["cat-1"]).toBe("dl-abc");
  });

  it("TC-F05: MODEL_DOWNLOAD_PROGRESS stores phase and speed", () => {
    const state = modelsReducer(initialModelsState, {
      type: MODEL_DOWNLOAD_PROGRESS,
      payload: {
        downloadId: "dl-abc",
        bytesRead: 512,
        totalBytes: 1024,
        phase: DownloadState.Downloading,
        speedBytesPerSecond: 50000,
        error: null,
      },
    });
    const prog = state.downloadProgress["dl-abc"];
    expect(prog?.phase).toBe(DownloadState.Downloading);
    expect(prog?.bytesRead).toBe(512);
    expect(prog?.speedBytesPerSecond).toBe(50000);
  });

  it("TC-F06: MODEL_DOWNLOAD_COMPLETED removes download from progress and activeDownloads", () => {
    const withActive = {
      ...initialModelsState,
      activeDownloads: { "cat-1": "dl-abc" },
      downloadProgress: {
        "dl-abc": {
          bytesRead: 1024,
          totalBytes: 1024,
          phase: DownloadState.Completed,
          speedBytesPerSecond: null,
          error: null,
        },
      },
    };
    const state = modelsReducer(withActive, { type: MODEL_DOWNLOAD_COMPLETED, payload: "dl-abc" });
    expect(state.downloadProgress["dl-abc"]).toBeUndefined();
    expect(state.activeDownloads["cat-1"]).toBeUndefined();
  });

  it("TC-F07: LOAD_ACTIVE_DOWNLOADS sets isLoadingActiveDownloads=true", () => {
    const state = modelsReducer(initialModelsState, { type: LOAD_ACTIVE_DOWNLOADS });
    expect(state.isLoadingActiveDownloads).toBe(true);
  });

  it("TC-F08: LOAD_ACTIVE_DOWNLOADS_SUCCESS populates activeDownloadList", () => {
    const downloads = [
      {
        id: "dl-1",
        catalogueId: "cat-1",
        state: DownloadState.Downloading,
        bytesReceived: 512,
        totalBytes: 1024,
        speedBytesPerSecond: 10000,
        errorMessage: null,
        startedAt: "2026-05-01T00:00:00Z",
      },
    ];
    const state = modelsReducer(initialModelsState, {
      type: LOAD_ACTIVE_DOWNLOADS_SUCCESS,
      payload: downloads,
    });
    expect(state.isLoadingActiveDownloads).toBe(false);
    expect(state.activeDownloadList).toHaveLength(1);
    expect(state.activeDownloadList[0]?.id).toBe("dl-1");
  });

  it("TC-F09: CANCEL_MODEL_DOWNLOAD_REQUESTED sets cancellingDownloadId", () => {
    const state = modelsReducer(initialModelsState, {
      type: CANCEL_MODEL_DOWNLOAD_REQUESTED,
      payload: "dl-xyz",
    });
    expect(state.cancellingDownloadId).toBe("dl-xyz");
  });

  it("TC-F10: CANCEL_MODEL_DOWNLOAD_SUCCESS clears cancellingDownloadId", () => {
    const withCancelling = { ...initialModelsState, cancellingDownloadId: "dl-xyz" };
    const state = modelsReducer(withCancelling, {
      type: CANCEL_MODEL_DOWNLOAD_SUCCESS,
      payload: "dl-xyz",
    });
    expect(state.cancellingDownloadId).toBeNull();
  });

  it("TC-F10b: DOWNLOAD_MODEL_REQUEST_FAILED clears requestingDownloadId", () => {
    const withRequesting = { ...initialModelsState, requestingDownloadId: "cat-1" };
    const state = modelsReducer(withRequesting, {
      type: DOWNLOAD_MODEL_REQUEST_FAILED,
      payload: { catalogueId: "cat-1", error: "HTTP 404" },
    });
    expect(state.requestingDownloadId).toBeNull();
  });

  it("TC-F11: DOWNLOAD_MODEL_STARTED appends an optimistic Queued entry to activeDownloadList", () => {
    const state = modelsReducer(initialModelsState, {
      type: DOWNLOAD_MODEL_STARTED,
      payload: { catalogueId: "cat-2", downloadId: "dl-2" },
    });
    expect(state.activeDownloadList).toHaveLength(1);
    expect(state.activeDownloadList[0]?.id).toBe("dl-2");
    expect(state.activeDownloadList[0]?.state).toBe(DownloadState.Queued);
    expect(state.isDownloadsDrawerOpen).toBe(true);
  });

  it("TC-F11b: DOWNLOAD_MODEL_STARTED is idempotent in activeDownloadList", () => {
    const seeded = {
      ...initialModelsState,
      activeDownloadList: [
        {
          id: "dl-2",
          catalogueId: "cat-2",
          state: DownloadState.Downloading,
          bytesReceived: 100,
          totalBytes: 1024,
          speedBytesPerSecond: 50,
          errorMessage: null,
          startedAt: null,
        },
      ],
    };
    const state = modelsReducer(seeded, {
      type: DOWNLOAD_MODEL_STARTED,
      payload: { catalogueId: "cat-2", downloadId: "dl-2" },
    });
    expect(state.activeDownloadList).toHaveLength(1);
    expect(state.activeDownloadList[0]?.bytesReceived).toBe(100);
  });

  it("TC-F12: MODEL_DOWNLOAD_PROGRESS patches the matching activeDownloadList entry", () => {
    const seeded = {
      ...initialModelsState,
      activeDownloadList: [
        {
          id: "dl-3",
          catalogueId: "cat-3",
          state: DownloadState.Queued,
          bytesReceived: 0,
          totalBytes: null,
          speedBytesPerSecond: null,
          errorMessage: null,
          startedAt: null,
        },
      ],
    };
    const state = modelsReducer(seeded, {
      type: MODEL_DOWNLOAD_PROGRESS,
      payload: {
        downloadId: "dl-3",
        bytesRead: 256,
        totalBytes: 1024,
        phase: DownloadState.Downloading,
        speedBytesPerSecond: 100,
        error: null,
      },
    });
    expect(state.activeDownloadList[0]?.bytesReceived).toBe(256);
    expect(state.activeDownloadList[0]?.totalBytes).toBe(1024);
    expect(state.activeDownloadList[0]?.state).toBe(DownloadState.Downloading);
    expect(state.activeDownloadList[0]?.speedBytesPerSecond).toBe(100);
  });

  it("TC-F12b: MODEL_DOWNLOAD_PROGRESS bytesReceived never goes back (max merge)", () => {
    const seeded = {
      ...initialModelsState,
      activeDownloadList: [
        {
          id: "dl-3",
          catalogueId: "cat-3",
          state: DownloadState.Downloading,
          bytesReceived: 500,
          totalBytes: 1024,
          speedBytesPerSecond: 50,
          errorMessage: null,
          startedAt: null,
        },
      ],
    };
    const state = modelsReducer(seeded, {
      type: MODEL_DOWNLOAD_PROGRESS,
      payload: {
        downloadId: "dl-3",
        bytesRead: 100,
        totalBytes: 1024,
        phase: DownloadState.Downloading,
        speedBytesPerSecond: 30,
        error: null,
      },
    });
    expect(state.activeDownloadList[0]?.bytesReceived).toBe(500);
  });

  it("TC-F12c: MODEL_DOWNLOAD_COMPLETED removes from activeDownloadList", () => {
    const seeded = {
      ...initialModelsState,
      activeDownloads: { "cat-3": "dl-3" },
      activeDownloadList: [
        {
          id: "dl-3",
          catalogueId: "cat-3",
          state: DownloadState.Completed,
          bytesReceived: 1024,
          totalBytes: 1024,
          speedBytesPerSecond: null,
          errorMessage: null,
          startedAt: null,
        },
      ],
    };
    const state = modelsReducer(seeded, {
      type: MODEL_DOWNLOAD_COMPLETED,
      payload: "dl-3",
    });
    expect(state.activeDownloadList).toHaveLength(0);
  });

  it("TC-F13: OPEN_DOWNLOADS_DRAWER and CLOSE_DOWNLOADS_DRAWER toggle isDownloadsDrawerOpen", () => {
    const opened = modelsReducer(initialModelsState, { type: OPEN_DOWNLOADS_DRAWER });
    expect(opened.isDownloadsDrawerOpen).toBe(true);
    const closed = modelsReducer(opened, { type: CLOSE_DOWNLOADS_DRAWER });
    expect(closed.isDownloadsDrawerOpen).toBe(false);
  });

  it("TC-F13a: SET_HIGHLIGHTED_DOWNLOAD stores id and CLEAR resets it", () => {
    const set = modelsReducer(initialModelsState, {
      type: "models/SET_HIGHLIGHTED_DOWNLOAD",
      payload: "dl-h1",
    } as never);
    expect(set.highlightedDownloadId).toBe("dl-h1");
    const cleared = modelsReducer(set, { type: "models/CLEAR_HIGHLIGHTED_DOWNLOAD" } as never);
    expect(cleared.highlightedDownloadId).toBeNull();
  });

  it("TC-F13b: CLOSE_DOWNLOADS_DRAWER clears highlight as a side effect", () => {
    const set = modelsReducer(
      { ...initialModelsState, isDownloadsDrawerOpen: true, highlightedDownloadId: "dl-h2" },
      { type: "models/CLOSE_DOWNLOADS_DRAWER" } as never
    );
    expect(set.isDownloadsDrawerOpen).toBe(false);
    expect(set.highlightedDownloadId).toBeNull();
  });

  it("TC-F11b: DOWNLOAD_MODEL_STARTED drops prior Failed entries for same catalogueId", () => {
    const seeded = {
      ...initialModelsState,
      activeDownloadList: [
        {
          id: "dl-old",
          catalogueId: "cat-retry",
          state: DownloadState.Failed,
          bytesReceived: 100,
          totalBytes: 1024,
          speedBytesPerSecond: null,
          errorMessage: "boom",
          startedAt: null,
        },
      ],
    };
    const state = modelsReducer(seeded, {
      type: DOWNLOAD_MODEL_STARTED,
      payload: { catalogueId: "cat-retry", downloadId: "dl-new" },
    });
    expect(state.activeDownloadList).toHaveLength(1);
    expect(state.activeDownloadList[0]?.id).toBe("dl-new");
    expect(state.activeDownloadList[0]?.state).toBe(DownloadState.Queued);
  });

  it("TC-F14: LOAD_ACTIVE_DOWNLOADS_SUCCESS keeps fresher per-id bytesReceived from previous list", () => {
    const seeded = {
      ...initialModelsState,
      activeDownloadList: [
        {
          id: "dl-4",
          catalogueId: "cat-4",
          state: DownloadState.Downloading,
          bytesReceived: 800,
          totalBytes: 1024,
          speedBytesPerSecond: 100,
          errorMessage: null,
          startedAt: null,
        },
      ],
    };
    const state = modelsReducer(seeded, {
      type: LOAD_ACTIVE_DOWNLOADS_SUCCESS,
      payload: [
        {
          id: "dl-4",
          catalogueId: "cat-4",
          state: DownloadState.Downloading,
          bytesReceived: 200,
          totalBytes: 1024,
          speedBytesPerSecond: 50,
          errorMessage: null,
          startedAt: null,
        },
      ],
    });
    expect(state.activeDownloadList[0]?.bytesReceived).toBe(800);
    expect(state.activeDownloadList[0]?.speedBytesPerSecond).toBe(100);
  });
});
