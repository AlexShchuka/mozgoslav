import type {ModelKind} from "./enums";

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
