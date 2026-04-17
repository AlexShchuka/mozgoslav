export type ModelKind = "stt" | "vad" | "llm";

export interface ModelEntry {
  id: string;
  name: string;
  description: string;
  kind: ModelKind;
  isDefault: boolean;
  destinationPath: string;
  installed: boolean;
}
