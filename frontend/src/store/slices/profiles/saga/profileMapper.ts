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

export function mapGqlProfile(p: {
  id: string;
  name: string;
  systemPrompt: string;
  transcriptionPromptOverride: string;
  outputTemplate: string;
  cleanupLevel: CleanupLevel;
  exportFolder: string;
  autoTags: ReadonlyArray<string>;
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
  glossary: string[];
  llmCorrectionEnabled: boolean;
  isDefault: boolean;
} {
  return {
    name: draft.name,
    systemPrompt: draft.systemPrompt,
    outputTemplate: draft.outputTemplate,
    cleanupLevel: domainCleanupLevelToGql(draft.cleanupLevel),
    exportFolder: draft.exportFolder,
    autoTags: [...draft.autoTags],
    glossary: [],
    llmCorrectionEnabled: false,
    isDefault: draft.isDefault,
  };
}
