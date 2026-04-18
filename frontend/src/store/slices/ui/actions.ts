import type { ThemeMode, ToastEntry } from "./types";

export const SET_THEME_MODE = "ui/SET_THEME_MODE";
export const OPEN_MODAL = "ui/OPEN_MODAL";
export const CLOSE_MODAL = "ui/CLOSE_MODAL";
export const PUSH_TOAST = "ui/PUSH_TOAST";
export const DISMISS_TOAST = "ui/DISMISS_TOAST";

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

export type UiAction =
  | SetThemeModeAction
  | OpenModalAction
  | CloseModalAction
  | PushToastAction
  | DismissToastAction;

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
