export type ThemeMode = "system" | "light" | "dark";

export interface ToastEntry {
  readonly id: string;
  readonly kind: "success" | "error" | "info" | "warning";
  readonly message: string;
}

export type OpenNoteResolution =
  | { status: "pending" }
  | { status: "resolved"; firstNoteId: string | null }
  | { status: "failed"; error: string };

export interface UiState {
  readonly themeMode: ThemeMode;
  readonly openModals: readonly string[];
  readonly toasts: readonly ToastEntry[];
  readonly openNoteResolutions: Record<string, OpenNoteResolution>;
}

export const initialUiState: UiState = {
  themeMode: "system",
  openModals: [],
  toasts: [],
  openNoteResolutions: {},
};
