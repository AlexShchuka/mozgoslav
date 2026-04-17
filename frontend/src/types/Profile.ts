export type CleanupLevel = "None" | "Light" | "Aggressive";

export interface Profile {
  id: string;
  name: string;
  systemPrompt: string;
  transcriptionPromptOverride: string;
  outputTemplate: string;
  cleanupLevel: CleanupLevel;
  exportFolder: string;
  autoTags: string[];
  isDefault: boolean;
  isBuiltIn: boolean;
}
