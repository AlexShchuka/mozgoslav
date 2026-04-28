import type { Reducer } from "redux";
import {
  CREATE_PROMPT,
  CREATE_PROMPT_FAILURE,
  CREATE_PROMPT_SUCCESS,
  DELETE_PROMPT,
  DELETE_PROMPT_FAILURE,
  DELETE_PROMPT_SUCCESS,
  LOAD_PROMPTS,
  LOAD_PROMPTS_FAILURE,
  LOAD_PROMPTS_SUCCESS,
  PREVIEW_PROMPT,
  PREVIEW_PROMPT_CLEAR,
  PREVIEW_PROMPT_FAILURE,
  PREVIEW_PROMPT_SUCCESS,
  UPDATE_PROMPT,
  UPDATE_PROMPT_FAILURE,
  UPDATE_PROMPT_SUCCESS,
  type PromptsAction,
} from "./actions";
import { initialPromptsState, type PromptsState } from "./types";
import type { PromptTemplate } from "../../../domain/prompts";

export const promptsReducer: Reducer<PromptsState> = (
  state: PromptsState = initialPromptsState,
  action
): PromptsState => {
  const typed = action as PromptsAction;
  switch (typed.type) {
    case LOAD_PROMPTS:
      return { ...state, isLoading: true, error: null };
    case LOAD_PROMPTS_SUCCESS:
      return {
        ...state,
        isLoading: false,
        templates: (typed as { payload: PromptTemplate[] }).payload,
        error: null,
      };
    case LOAD_PROMPTS_FAILURE:
      return { ...state, isLoading: false, error: (typed as { payload: string }).payload };
    case CREATE_PROMPT:
      return { ...state, error: null };
    case CREATE_PROMPT_SUCCESS: {
      const t = (typed as { payload: PromptTemplate }).payload;
      return { ...state, templates: [...state.templates, t] };
    }
    case CREATE_PROMPT_FAILURE:
      return { ...state, error: (typed as { payload: string }).payload };
    case UPDATE_PROMPT: {
      const { id } = (typed as { payload: { id: string } }).payload;
      return { ...state, savingIds: { ...state.savingIds, [id]: true }, error: null };
    }
    case UPDATE_PROMPT_SUCCESS: {
      const updated = (typed as { payload: PromptTemplate }).payload;
      const { [updated.id]: _removed, ...restSaving } = state.savingIds;
      return {
        ...state,
        savingIds: restSaving,
        templates: state.templates.map((t) => (t.id === updated.id ? updated : t)),
      };
    }
    case UPDATE_PROMPT_FAILURE: {
      return { ...state, savingIds: {}, error: (typed as { payload: string }).payload };
    }
    case DELETE_PROMPT: {
      const id = (typed as { payload: string }).payload;
      return { ...state, deletingIds: { ...state.deletingIds, [id]: true }, error: null };
    }
    case DELETE_PROMPT_SUCCESS: {
      const id = (typed as { payload: string }).payload;
      const { [id]: _removed, ...restDeleting } = state.deletingIds;
      return {
        ...state,
        deletingIds: restDeleting,
        templates: state.templates.filter((t) => t.id !== id),
      };
    }
    case DELETE_PROMPT_FAILURE:
      return { ...state, deletingIds: {}, error: (typed as { payload: string }).payload };
    case PREVIEW_PROMPT:
      return { ...state, isPreviewLoading: true, previewResult: null };
    case PREVIEW_PROMPT_SUCCESS:
      return {
        ...state,
        isPreviewLoading: false,
        previewResult: (typed as { payload: string }).payload,
      };
    case PREVIEW_PROMPT_FAILURE:
      return {
        ...state,
        isPreviewLoading: false,
        error: (typed as { payload: string }).payload,
      };
    case PREVIEW_PROMPT_CLEAR:
      return { ...state, previewResult: null, isPreviewLoading: false };
    default:
      return state;
  }
};
