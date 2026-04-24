export type CleanupLevel = "None" | "Light" | "Aggressive";
export type ConversationType = "Meeting" | "OneOnOne" | "Idea" | "Personal" | "Other";
export type JobStatus =
  | "Queued"
  | "Transcribing"
  | "Correcting"
  | "Summarizing"
  | "Exporting"
  | "Done"
  | "Failed"
  | "Cancelled";
export type RecordingStatus = "New" | "Transcribing" | "Transcribed" | "Failed";
export type AudioFormat = "Mp3" | "M4A" | "Wav" | "Mp4" | "Ogg" | "Flac" | "Webm" | "Aac";
export type SourceType = "Recorded" | "Imported";
export type ModelKind = "Stt" | "Vad" | "Llm";
