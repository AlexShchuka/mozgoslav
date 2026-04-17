import type { ModelKind } from "./enums";

export interface ModelEntry {
  id: string;
  name: string;
  description: string;
  url: string;
  sizeMb: number;
  kind: ModelKind;
  isDefault: boolean;
  destinationPath: string;
  installed: boolean;
}
