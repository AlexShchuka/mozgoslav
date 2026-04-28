import type { SystemActionTemplate } from "./types";

export const LOAD_SYSTEM_ACTION_TEMPLATES = "systemActions/LOAD_TEMPLATES";
export const LOAD_SYSTEM_ACTION_TEMPLATES_SUCCESS = "systemActions/LOAD_TEMPLATES_SUCCESS";
export const LOAD_SYSTEM_ACTION_TEMPLATES_FAILURE = "systemActions/LOAD_TEMPLATES_FAILURE";

export interface LoadSystemActionTemplatesAction {
  type: typeof LOAD_SYSTEM_ACTION_TEMPLATES;
}

export interface LoadSystemActionTemplatesSuccessAction {
  type: typeof LOAD_SYSTEM_ACTION_TEMPLATES_SUCCESS;
  payload: SystemActionTemplate[];
}

export interface LoadSystemActionTemplatesFailureAction {
  type: typeof LOAD_SYSTEM_ACTION_TEMPLATES_FAILURE;
  payload: string;
}

export type SystemActionsAction =
  | LoadSystemActionTemplatesAction
  | LoadSystemActionTemplatesSuccessAction
  | LoadSystemActionTemplatesFailureAction;

export const loadSystemActionTemplates = (): LoadSystemActionTemplatesAction => ({
  type: LOAD_SYSTEM_ACTION_TEMPLATES,
});

export const loadSystemActionTemplatesSuccess = (
  templates: SystemActionTemplate[]
): LoadSystemActionTemplatesSuccessAction => ({
  type: LOAD_SYSTEM_ACTION_TEMPLATES_SUCCESS,
  payload: templates,
});

export const loadSystemActionTemplatesFailure = (
  error: string
): LoadSystemActionTemplatesFailureAction => ({
  type: LOAD_SYSTEM_ACTION_TEMPLATES_FAILURE,
  payload: error,
});
