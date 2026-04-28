import type { WebSearchConfig } from "./types";

export const LOAD_WEB_SEARCH_CONFIG = "webSearch/LOAD_CONFIG";
export const LOAD_WEB_SEARCH_CONFIG_SUCCESS = "webSearch/LOAD_CONFIG_SUCCESS";
export const LOAD_WEB_SEARCH_CONFIG_FAILURE = "webSearch/LOAD_CONFIG_FAILURE";

export const SAVE_WEB_SEARCH_CONFIG = "webSearch/SAVE_CONFIG";
export const SAVE_WEB_SEARCH_CONFIG_SUCCESS = "webSearch/SAVE_CONFIG_SUCCESS";
export const SAVE_WEB_SEARCH_CONFIG_FAILURE = "webSearch/SAVE_CONFIG_FAILURE";

export interface LoadWebSearchConfigAction {
  type: typeof LOAD_WEB_SEARCH_CONFIG;
}

export interface LoadWebSearchConfigSuccessAction {
  type: typeof LOAD_WEB_SEARCH_CONFIG_SUCCESS;
  payload: WebSearchConfig;
}

export interface LoadWebSearchConfigFailureAction {
  type: typeof LOAD_WEB_SEARCH_CONFIG_FAILURE;
}

export interface SaveWebSearchConfigAction {
  type: typeof SAVE_WEB_SEARCH_CONFIG;
  payload: WebSearchConfig;
}

export interface SaveWebSearchConfigSuccessAction {
  type: typeof SAVE_WEB_SEARCH_CONFIG_SUCCESS;
  payload: WebSearchConfig;
}

export interface SaveWebSearchConfigFailureAction {
  type: typeof SAVE_WEB_SEARCH_CONFIG_FAILURE;
}

export type WebSearchAction =
  | LoadWebSearchConfigAction
  | LoadWebSearchConfigSuccessAction
  | LoadWebSearchConfigFailureAction
  | SaveWebSearchConfigAction
  | SaveWebSearchConfigSuccessAction
  | SaveWebSearchConfigFailureAction;

export const loadWebSearchConfig = (): LoadWebSearchConfigAction => ({
  type: LOAD_WEB_SEARCH_CONFIG,
});

export const loadWebSearchConfigSuccess = (
  config: WebSearchConfig
): LoadWebSearchConfigSuccessAction => ({
  type: LOAD_WEB_SEARCH_CONFIG_SUCCESS,
  payload: config,
});

export const loadWebSearchConfigFailure = (): LoadWebSearchConfigFailureAction => ({
  type: LOAD_WEB_SEARCH_CONFIG_FAILURE,
});

export const saveWebSearchConfig = (config: WebSearchConfig): SaveWebSearchConfigAction => ({
  type: SAVE_WEB_SEARCH_CONFIG,
  payload: config,
});

export const saveWebSearchConfigSuccess = (
  config: WebSearchConfig
): SaveWebSearchConfigSuccessAction => ({
  type: SAVE_WEB_SEARCH_CONFIG_SUCCESS,
  payload: config,
});

export const saveWebSearchConfigFailure = (): SaveWebSearchConfigFailureAction => ({
  type: SAVE_WEB_SEARCH_CONFIG_FAILURE,
});
