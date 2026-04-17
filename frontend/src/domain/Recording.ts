import type { AudioFormat, RecordingStatus, SourceType } from "./enums";

export interface Recording {
  id: string;
  fileName: string;
  filePath: string;
  sha256: string;
  duration: string;
  format: AudioFormat;
  sourceType: SourceType;
  status: RecordingStatus;
  createdAt: string;
}
