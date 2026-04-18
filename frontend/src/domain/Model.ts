import type { ModelKind } from "./enums";

// ADR-010 two-tier distribution. Onboarding shows only Tier 1 on its
// models card; the full catalogue (Tier 2 downloadables) lives on the
// Settings → Models page.
export type ModelTier = "bundle" | "downloadable";

export interface ModelEntry {
  id: string;
  name: string;
  description: string;
  url: string;
  sizeMb: number;
  kind: ModelKind;
  tier: ModelTier;
  isDefault: boolean;
  destinationPath: string;
  installed: boolean;
}
