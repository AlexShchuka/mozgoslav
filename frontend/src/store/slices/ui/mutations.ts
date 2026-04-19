import type {ToastEntry, UiState} from "./types";

export const addModal = (state: UiState, id: string): UiState =>
    state.openModals.includes(id)
        ? state
        : {...state, openModals: [...state.openModals, id]};

export const removeModal = (state: UiState, id: string): UiState => ({
    ...state,
    openModals: state.openModals.filter((m) => m !== id),
});

export const addToast = (state: UiState, toast: ToastEntry): UiState => ({
    ...state,
    toasts: [...state.toasts, toast],
});

export const removeToast = (state: UiState, id: string): UiState => ({
    ...state,
    toasts: state.toasts.filter((t) => t.id !== id),
});
