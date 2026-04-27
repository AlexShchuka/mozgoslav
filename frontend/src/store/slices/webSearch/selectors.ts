import type { GlobalState } from "../../rootReducer";

export const selectWebSearchConfig = (state: GlobalState) => state.webSearch.config;
export const selectWebSearchIsLoading = (state: GlobalState) => state.webSearch.isLoading;
export const selectWebSearchIsSaving = (state: GlobalState) => state.webSearch.isSaving;
