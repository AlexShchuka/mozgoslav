import type { PromptTemplate } from "../../../domain/prompts";

export interface PromptsState {
  templates: PromptTemplate[];
  isLoading: boolean;
  error: string | null;
  savingIds: Record<string, true>;
  deletingIds: Record<string, true>;
  previewResult: string | null;
  isPreviewLoading: boolean;
}

export const initialPromptsState: PromptsState = {
  templates: [],
  isLoading: false,
  error: null,
  savingIds: {},
  deletingIds: {},
  previewResult: null,
  isPreviewLoading: false,
};
