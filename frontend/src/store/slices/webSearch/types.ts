export interface WebSearchConfig {
  ddgEnabled: boolean;
  yandexEnabled: boolean;
  googleEnabled: boolean;
  cacheTtlHours: number;
  rawSettingsYaml: string;
}

export interface WebSearchState {
  config: WebSearchConfig | null;
  isLoading: boolean;
  isSaving: boolean;
}
