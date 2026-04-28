import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { PromptsState } from "./types";

const selectPromptsState = (state: GlobalState): PromptsState => state.prompts;

export const selectAllPrompts = createSelector(selectPromptsState, (slice) => slice.templates);

export const selectPromptsLoading = createSelector(selectPromptsState, (slice) => slice.isLoading);

export const selectPromptsError = createSelector(selectPromptsState, (slice) => slice.error);

export const selectPromptPreviewResult = createSelector(
  selectPromptsState,
  (slice) => slice.previewResult
);

export const selectIsPreviewLoading = createSelector(
  selectPromptsState,
  (slice) => slice.isPreviewLoading
);

export const selectIsDeletingPrompt = (id: string) =>
  createSelector(selectPromptsState, (slice) => slice.deletingIds[id] === true);

export const selectIsSavingPrompt = (id: string) =>
  createSelector(selectPromptsState, (slice) => slice.savingIds[id] === true);
