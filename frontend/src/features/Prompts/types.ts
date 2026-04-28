import type { PromptTemplate } from "../../domain/prompts";

export interface PromptsProps {
  templates: PromptTemplate[];
  isLoading: boolean;
  error: string | null;
  previewResult: string | null;
  isPreviewLoading: boolean;
  deletingIds: Record<string, true>;
  onLoad: () => void;
  onCreate: (name: string, body: string) => void;
  onUpdate: (id: string, name: string, body: string) => void;
  onDelete: (id: string) => void;
  onPreview: (templateBody: string) => void;
  onPreviewClear: () => void;
}
