import type { ThemeMode, ToastEntry } from "./types";

export const SET_THEME_MODE = "ui/SET_THEME_MODE";
export const OPEN_MODAL = "ui/OPEN_MODAL";
export const CLOSE_MODAL = "ui/CLOSE_MODAL";
export const PUSH_TOAST = "ui/PUSH_TOAST";
export const DISMISS_TOAST = "ui/DISMISS_TOAST";
export const OPEN_NOTE_REQUESTED = "ui/OPEN_NOTE_REQUESTED";
export const OPEN_NOTE_RESOLVED = "ui/OPEN_NOTE_RESOLVED";
export const OPEN_NOTE_FAILED = "ui/OPEN_NOTE_FAILED";
export const CLEAR_OPEN_NOTE_RESOLUTION = "ui/CLEAR_OPEN_NOTE_RESOLUTION";

export interface SetThemeModeAction {
  type: typeof SET_THEME_MODE;
  payload: ThemeMode;
}

export interface OpenModalAction {
  type: typeof OPEN_MODAL;
  payload: { id: string };
}

export interface CloseModalAction {
  type: typeof CLOSE_MODAL;
  payload: { id: string };
}

export interface PushToastAction {
  type: typeof PUSH_TOAST;
  payload: ToastEntry;
}

export interface DismissToastAction {
  type: typeof DISMISS_TOAST;
  payload: { id: string };
}

export interface OpenNoteRequestedAction {
  type: typeof OPEN_NOTE_REQUESTED;
  payload: string;
}

export interface OpenNoteResolvedAction {
  type: typeof OPEN_NOTE_RESOLVED;
  payload: { recordingId: string; firstNoteId: string | null };
}

export interface OpenNoteFailedAction {
  type: typeof OPEN_NOTE_FAILED;
  payload: { recordingId: string; error: string };
}

export interface ClearOpenNoteResolutionAction {
  type: typeof CLEAR_OPEN_NOTE_RESOLUTION;
  payload: string;
}

export type UiAction =
  | SetThemeModeAction
  | OpenModalAction
  | CloseModalAction
  | PushToastAction
  | DismissToastAction
  | OpenNoteRequestedAction
  | OpenNoteResolvedAction
  | OpenNoteFailedAction
  | ClearOpenNoteResolutionAction;

export const setThemeMode = (mode: ThemeMode): SetThemeModeAction => ({
  type: SET_THEME_MODE,
  payload: mode,
});

export const openModal = (id: string): OpenModalAction => ({
  type: OPEN_MODAL,
  payload: { id },
});

export const closeModal = (id: string): CloseModalAction => ({
  type: CLOSE_MODAL,
  payload: { id },
});

export const pushToast = (toast: ToastEntry): PushToastAction => ({
  type: PUSH_TOAST,
  payload: toast,
});

export const dismissToast = (id: string): DismissToastAction => ({
  type: DISMISS_TOAST,
  payload: { id },
});

export const openNoteRequested = (recordingId: string): OpenNoteRequestedAction => ({
  type: OPEN_NOTE_REQUESTED,
  payload: recordingId,
});

export const openNoteResolved = (
  recordingId: string,
  firstNoteId: string | null
): OpenNoteResolvedAction => ({
  type: OPEN_NOTE_RESOLVED,
  payload: { recordingId, firstNoteId },
});

export const openNoteFailed = (recordingId: string, error: string): OpenNoteFailedAction => ({
  type: OPEN_NOTE_FAILED,
  payload: { recordingId, error },
});

export const clearOpenNoteResolution = (recordingId: string): ClearOpenNoteResolutionAction => ({
  type: CLEAR_OPEN_NOTE_RESOLUTION,
  payload: recordingId,
});
