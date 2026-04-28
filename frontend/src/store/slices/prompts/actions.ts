import type { PromptTemplate } from "../../../domain/prompts";

export const LOAD_PROMPTS = "prompts/LOAD";
export const LOAD_PROMPTS_SUCCESS = "prompts/LOAD_SUCCESS";
export const LOAD_PROMPTS_FAILURE = "prompts/LOAD_FAILURE";

export const CREATE_PROMPT = "prompts/CREATE";
export const CREATE_PROMPT_SUCCESS = "prompts/CREATE_SUCCESS";
export const CREATE_PROMPT_FAILURE = "prompts/CREATE_FAILURE";

export const UPDATE_PROMPT = "prompts/UPDATE";
export const UPDATE_PROMPT_SUCCESS = "prompts/UPDATE_SUCCESS";
export const UPDATE_PROMPT_FAILURE = "prompts/UPDATE_FAILURE";

export const DELETE_PROMPT = "prompts/DELETE";
export const DELETE_PROMPT_SUCCESS = "prompts/DELETE_SUCCESS";
export const DELETE_PROMPT_FAILURE = "prompts/DELETE_FAILURE";

export const PREVIEW_PROMPT = "prompts/PREVIEW";
export const PREVIEW_PROMPT_SUCCESS = "prompts/PREVIEW_SUCCESS";
export const PREVIEW_PROMPT_FAILURE = "prompts/PREVIEW_FAILURE";
export const PREVIEW_PROMPT_CLEAR = "prompts/PREVIEW_CLEAR";

export interface LoadPromptsAction {
  type: typeof LOAD_PROMPTS;
}

export interface LoadPromptsSuccessAction {
  type: typeof LOAD_PROMPTS_SUCCESS;
  payload: PromptTemplate[];
}

export interface LoadPromptsFailureAction {
  type: typeof LOAD_PROMPTS_FAILURE;
  payload: string;
}

export interface CreatePromptAction {
  type: typeof CREATE_PROMPT;
  payload: { name: string; body: string };
}

export interface CreatePromptSuccessAction {
  type: typeof CREATE_PROMPT_SUCCESS;
  payload: PromptTemplate;
}

export interface CreatePromptFailureAction {
  type: typeof CREATE_PROMPT_FAILURE;
  payload: string;
}

export interface UpdatePromptAction {
  type: typeof UPDATE_PROMPT;
  payload: { id: string; name: string; body: string };
}

export interface UpdatePromptSuccessAction {
  type: typeof UPDATE_PROMPT_SUCCESS;
  payload: PromptTemplate;
}

export interface UpdatePromptFailureAction {
  type: typeof UPDATE_PROMPT_FAILURE;
  payload: string;
}

export interface DeletePromptAction {
  type: typeof DELETE_PROMPT;
  payload: string;
}

export interface DeletePromptSuccessAction {
  type: typeof DELETE_PROMPT_SUCCESS;
  payload: string;
}

export interface DeletePromptFailureAction {
  type: typeof DELETE_PROMPT_FAILURE;
  payload: string;
}

export interface PreviewPromptAction {
  type: typeof PREVIEW_PROMPT;
  payload: { templateBody: string };
}

export interface PreviewPromptSuccessAction {
  type: typeof PREVIEW_PROMPT_SUCCESS;
  payload: string;
}

export interface PreviewPromptFailureAction {
  type: typeof PREVIEW_PROMPT_FAILURE;
  payload: string;
}

export interface PreviewPromptClearAction {
  type: typeof PREVIEW_PROMPT_CLEAR;
}

export type PromptsAction =
  | LoadPromptsAction
  | LoadPromptsSuccessAction
  | LoadPromptsFailureAction
  | CreatePromptAction
  | CreatePromptSuccessAction
  | CreatePromptFailureAction
  | UpdatePromptAction
  | UpdatePromptSuccessAction
  | UpdatePromptFailureAction
  | DeletePromptAction
  | DeletePromptSuccessAction
  | DeletePromptFailureAction
  | PreviewPromptAction
  | PreviewPromptSuccessAction
  | PreviewPromptFailureAction
  | PreviewPromptClearAction;

export const loadPrompts = (): LoadPromptsAction => ({ type: LOAD_PROMPTS });

export const loadPromptsSuccess = (templates: PromptTemplate[]): LoadPromptsSuccessAction => ({
  type: LOAD_PROMPTS_SUCCESS,
  payload: templates,
});

export const loadPromptsFailure = (message: string): LoadPromptsFailureAction => ({
  type: LOAD_PROMPTS_FAILURE,
  payload: message,
});

export const createPrompt = (name: string, body: string): CreatePromptAction => ({
  type: CREATE_PROMPT,
  payload: { name, body },
});

export const createPromptSuccess = (template: PromptTemplate): CreatePromptSuccessAction => ({
  type: CREATE_PROMPT_SUCCESS,
  payload: template,
});

export const createPromptFailure = (message: string): CreatePromptFailureAction => ({
  type: CREATE_PROMPT_FAILURE,
  payload: message,
});

export const updatePrompt = (id: string, name: string, body: string): UpdatePromptAction => ({
  type: UPDATE_PROMPT,
  payload: { id, name, body },
});

export const updatePromptSuccess = (template: PromptTemplate): UpdatePromptSuccessAction => ({
  type: UPDATE_PROMPT_SUCCESS,
  payload: template,
});

export const updatePromptFailure = (message: string): UpdatePromptFailureAction => ({
  type: UPDATE_PROMPT_FAILURE,
  payload: message,
});

export const deletePrompt = (id: string): DeletePromptAction => ({
  type: DELETE_PROMPT,
  payload: id,
});

export const deletePromptSuccess = (id: string): DeletePromptSuccessAction => ({
  type: DELETE_PROMPT_SUCCESS,
  payload: id,
});

export const deletePromptFailure = (message: string): DeletePromptFailureAction => ({
  type: DELETE_PROMPT_FAILURE,
  payload: message,
});

export const previewPrompt = (templateBody: string): PreviewPromptAction => ({
  type: PREVIEW_PROMPT,
  payload: { templateBody },
});

export const previewPromptSuccess = (resolved: string): PreviewPromptSuccessAction => ({
  type: PREVIEW_PROMPT_SUCCESS,
  payload: resolved,
});

export const previewPromptFailure = (message: string): PreviewPromptFailureAction => ({
  type: PREVIEW_PROMPT_FAILURE,
  payload: message,
});

export const previewPromptClear = (): PreviewPromptClearAction => ({
  type: PREVIEW_PROMPT_CLEAR,
});
