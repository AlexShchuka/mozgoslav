import type { Reducer } from "redux";

import {
  CLEAR_OPEN_NOTE_RESOLUTION,
  CLOSE_MODAL,
  DISMISS_TOAST,
  OPEN_MODAL,
  OPEN_NOTE_FAILED,
  OPEN_NOTE_REQUESTED,
  OPEN_NOTE_RESOLVED,
  PUSH_TOAST,
  SET_THEME_MODE,
  type UiAction,
} from "./actions";
import { addModal, addToast, removeModal, removeToast } from "./mutations";
import { initialUiState, type UiState } from "./types";

export const uiReducer: Reducer<UiState> = (state: UiState = initialUiState, action): UiState => {
  const typed = action as unknown as UiAction;
  switch (typed.type) {
    case SET_THEME_MODE:
      return { ...state, themeMode: typed.payload };
    case OPEN_MODAL:
      return addModal(state, typed.payload.id);
    case CLOSE_MODAL:
      return removeModal(state, typed.payload.id);
    case PUSH_TOAST:
      return addToast(state, typed.payload);
    case DISMISS_TOAST:
      return removeToast(state, typed.payload.id);
    case OPEN_NOTE_REQUESTED: {
      const recordingId = (typed as { payload: string }).payload;
      return {
        ...state,
        openNoteResolutions: {
          ...state.openNoteResolutions,
          [recordingId]: { status: "pending" },
        },
      };
    }
    case OPEN_NOTE_RESOLVED: {
      const { recordingId, firstNoteId } = (
        typed as { payload: { recordingId: string; firstNoteId: string | null } }
      ).payload;
      return {
        ...state,
        openNoteResolutions: {
          ...state.openNoteResolutions,
          [recordingId]: { status: "resolved", firstNoteId },
        },
      };
    }
    case OPEN_NOTE_FAILED: {
      const { recordingId, error } = (typed as { payload: { recordingId: string; error: string } })
        .payload;
      return {
        ...state,
        openNoteResolutions: {
          ...state.openNoteResolutions,
          [recordingId]: { status: "failed", error },
        },
      };
    }
    case CLEAR_OPEN_NOTE_RESOLUTION: {
      const recordingId = (typed as { payload: string }).payload;
      const { [recordingId]: _removed, ...rest } = state.openNoteResolutions;
      return {
        ...state,
        openNoteResolutions: rest,
      };
    }
    default:
      return state;
  }
};
