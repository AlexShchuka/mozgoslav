export type AudioFormat = "Wav" | "Mp3" | "M4a" | "Flac" | "Ogg" | "Webm" | "Unknown";

export type RecordingStatus = "New" | "Queued" | "Transcribed" | "Failed";

export type SourceType = "Import" | "Upload" | "Meetily" | "Dictation";

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
