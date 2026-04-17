import type { AppSettings } from "../../../domain/Settings";
import type { SettingsState } from "./types";

/**
 * Helpers that isolate non-trivial reducer slice transitions so the switch
 * statement stays readable.
 */
export const markLlmProbing = (state: SettingsState): SettingsState => ({
  ...state,
  llmProbe: { ok: state.llmProbe.ok, probing: true },
});

export const settleLlmProbe = (state: SettingsState, ok: boolean): SettingsState => ({
  ...state,
  llmProbe: { ok, probing: false },
});

export const applyLoaded = (state: SettingsState, settings: AppSettings): SettingsState => ({
  ...state,
  settings,
  isLoading: false,
  error: null,
});

export const applySaved = (state: SettingsState, settings: AppSettings): SettingsState => ({
  ...state,
  settings,
  isSaving: false,
  error: null,
});
