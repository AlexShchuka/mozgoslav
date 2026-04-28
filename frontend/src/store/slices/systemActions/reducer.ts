import type { Reducer } from "redux";

import type { SystemActionsState } from "./types";
import { initialSystemActionsState } from "./types";
import {
  LOAD_SYSTEM_ACTION_TEMPLATES,
  LOAD_SYSTEM_ACTION_TEMPLATES_FAILURE,
  LOAD_SYSTEM_ACTION_TEMPLATES_SUCCESS,
  type SystemActionsAction,
} from "./actions";

export const systemActionsReducer: Reducer<SystemActionsState> = (
  state: SystemActionsState = initialSystemActionsState,
  action
): SystemActionsState => {
  const typed = action as SystemActionsAction;
  switch (typed.type) {
    case LOAD_SYSTEM_ACTION_TEMPLATES:
      return { ...state, isLoading: true, error: null };

    case LOAD_SYSTEM_ACTION_TEMPLATES_SUCCESS:
      return { ...state, isLoading: false, templates: typed.payload };

    case LOAD_SYSTEM_ACTION_TEMPLATES_FAILURE:
      return { ...state, isLoading: false, error: typed.payload };

    default:
      return state;
  }
};
