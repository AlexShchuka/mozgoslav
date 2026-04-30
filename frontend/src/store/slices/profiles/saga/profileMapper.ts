import { CleanupLevel } from "../../../../api/gql/graphql";
import type { Profile } from "../../../../domain/Profile";

export function gqlCleanupLevelToDomain(level: CleanupLevel): Profile["cleanupLevel"] {
  switch (level) {
    case CleanupLevel.None:
      return "None";
    case CleanupLevel.Light:
      return "Light";
    case CleanupLevel.Aggressive:
      return "Aggressive";
  }
}

export function domainCleanupLevelToGql(level: Profile["cleanupLevel"]): CleanupLevel {
  switch (level) {
    case "None":
      return CleanupLevel.None;
    case "Light":
      return CleanupLevel.Light;
    case "Aggressive":
      return CleanupLevel.Aggressive;
  }
}

export function glossaryEntriesToRecord(
  entries: ReadonlyArray<{ language: string; terms: ReadonlyArray<string> }>
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const { language, terms } of entries) {
    result[language] = [...terms];
  }
  return result;
}

export function recordToGlossaryEntries(
  record: Record<string, string[]>
): Array<{ language: string; terms: string[] }> {
  return Object.entries(record).map(([language, terms]) => ({ language, terms: [...terms] }));
}

export function mapGqlProfile(p: {
  id: string;
  name: string;
  systemPrompt: string;
  transcriptionPromptOverride: string;
  outputTemplate: string;
  cleanupLevel: CleanupLevel;
  exportFolder: string;
  autoTags: ReadonlyArray<string>;
  glossaryByLanguage: ReadonlyArray<{ language: string; terms: ReadonlyArray<string> }>;
  llmCorrectionEnabled: boolean;
  llmProviderOverride: string;
  llmModelOverride: string;
  isDefault: boolean;
  isBuiltIn: boolean;
}): Profile {
  return {
    id: p.id,
    name: p.name,
    systemPrompt: p.systemPrompt,
    transcriptionPromptOverride: p.transcriptionPromptOverride,
    outputTemplate: p.outputTemplate,
    cleanupLevel: gqlCleanupLevelToDomain(p.cleanupLevel),
    exportFolder: p.exportFolder,
    autoTags: [...p.autoTags],
    glossaryByLanguage: glossaryEntriesToRecord(p.glossaryByLanguage),
    llmCorrectionEnabled: p.llmCorrectionEnabled,
    llmProviderOverride: p.llmProviderOverride,
    llmModelOverride: p.llmModelOverride,
    isDefault: p.isDefault,
    isBuiltIn: p.isBuiltIn,
  };
}

export function mapDomainProfileToInput(draft: Omit<Profile, "id" | "isBuiltIn">): {
  name: string;
  systemPrompt: string;
  outputTemplate: string;
  cleanupLevel: CleanupLevel;
  exportFolder: string;
  autoTags: string[];
  glossaryByLanguage: Array<{ language: string; terms: string[] }>;
  llmCorrectionEnabled: boolean;
  llmProviderOverride: string;
  llmModelOverride: string;
  isDefault: boolean;
} {
  return {
    name: draft.name,
    systemPrompt: draft.systemPrompt,
    outputTemplate: draft.outputTemplate,
    cleanupLevel: domainCleanupLevelToGql(draft.cleanupLevel),
    exportFolder: draft.exportFolder,
    autoTags: [...draft.autoTags],
    glossaryByLanguage: recordToGlossaryEntries(draft.glossaryByLanguage ?? {}),
    llmCorrectionEnabled: draft.llmCorrectionEnabled,
    llmProviderOverride: draft.llmProviderOverride ?? "",
    llmModelOverride: draft.llmModelOverride ?? "",
    isDefault: draft.isDefault,
  };
}
