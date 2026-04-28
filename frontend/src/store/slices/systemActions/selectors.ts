import type { GlobalState } from "../../index";

export const selectSystemActionTemplates = (state: GlobalState) =>
  state.systemActions.templates;

export const selectSystemActionsIsLoading = (state: GlobalState) =>
  state.systemActions.isLoading;

export const selectSystemActionsError = (state: GlobalState) =>
  state.systemActions.error;
