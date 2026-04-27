import type { Reducer } from "redux";

import type { WebSearchAction } from "./actions";
import {
  LOAD_WEB_SEARCH_CONFIG,
  LOAD_WEB_SEARCH_CONFIG_FAILURE,
  LOAD_WEB_SEARCH_CONFIG_SUCCESS,
  SAVE_WEB_SEARCH_CONFIG,
  SAVE_WEB_SEARCH_CONFIG_FAILURE,
  SAVE_WEB_SEARCH_CONFIG_SUCCESS,
} from "./actions";
import type { WebSearchState } from "./types";

export const initialWebSearchState: WebSearchState = {
  config: null,
  isLoading: false,
  isSaving: false,
};

const webSearchReducer: Reducer<WebSearchState> = (
  state: WebSearchState = initialWebSearchState,
  action
): WebSearchState => {
  const typed = action as WebSearchAction;
  switch (typed.type) {
    case LOAD_WEB_SEARCH_CONFIG:
      return { ...state, isLoading: true };
    case LOAD_WEB_SEARCH_CONFIG_SUCCESS:
      return { ...state, isLoading: false, config: typed.payload };
    case LOAD_WEB_SEARCH_CONFIG_FAILURE:
      return { ...state, isLoading: false };
    case SAVE_WEB_SEARCH_CONFIG:
      return { ...state, isSaving: true };
    case SAVE_WEB_SEARCH_CONFIG_SUCCESS:
      return { ...state, isSaving: false, config: typed.payload };
    case SAVE_WEB_SEARCH_CONFIG_FAILURE:
      return { ...state, isSaving: false };
    default:
      return state;
  }
};

export default webSearchReducer;
