import type { WebSearchConfig } from "../../store/slices/webSearch/types";

export interface WebSearchSettingsProps {
  config: WebSearchConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  onLoad: () => void;
  onSave: (config: WebSearchConfig) => void;
}
