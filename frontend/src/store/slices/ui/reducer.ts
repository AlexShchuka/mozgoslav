import type { Reducer } from "redux";

import {
  CLOSE_MODAL,
  DISMISS_TOAST,
  OPEN_MODAL,
  PUSH_TOAST,
  SET_THEME_MODE,
  type UiAction,
} from "./actions";
import { addModal, addToast, removeModal, removeToast } from "./mutations";
import { initialUiState, type UiState } from "./types";

export const uiReducer: Reducer<UiState> = (
  state: UiState = initialUiState,
  action,
): UiState => {
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
    default:
      return state;
  }
};
