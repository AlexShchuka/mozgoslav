import type { Recording } from "../../../domain";
import {
  AudioFormat as GqlAudioFormat,
  RecordingStatus as GqlRecordingStatus,
  SourceType as GqlSourceType,
} from "../../../api/gql/graphql";

type GqlRecordingNode = {
  id: string;
  fileName: string;
  filePath: string;
  sha256: string;
  duration: unknown;
  format: GqlAudioFormat;
  sourceType: GqlSourceType;
  status: GqlRecordingStatus;
  createdAt: string;
};

function gqlAudioFormatToDomain(fmt: GqlAudioFormat): Recording["format"] {
  const map: Record<GqlAudioFormat, Recording["format"]> = {
    [GqlAudioFormat.Mp3]: "Mp3",
    [GqlAudioFormat.M4A]: "M4A",
    [GqlAudioFormat.Wav]: "Wav",
    [GqlAudioFormat.Mp4]: "Mp4",
    [GqlAudioFormat.Ogg]: "Ogg",
    [GqlAudioFormat.Flac]: "Flac",
    [GqlAudioFormat.Webm]: "Webm",
    [GqlAudioFormat.Aac]: "Aac",
  };
  return map[fmt] ?? "Wav";
}

function gqlSourceTypeToDomain(st: GqlSourceType): Recording["sourceType"] {
  return st === GqlSourceType.Recorded ? "Recorded" : "Imported";
}

function gqlStatusToDomain(s: GqlRecordingStatus): Recording["status"] {
  const map: Record<GqlRecordingStatus, Recording["status"]> = {
    [GqlRecordingStatus.New]: "New",
    [GqlRecordingStatus.Transcribing]: "Transcribing",
    [GqlRecordingStatus.Transcribed]: "Transcribed",
    [GqlRecordingStatus.Failed]: "Failed",
  };
  return map[s] ?? "New";
}

export function mapGqlRecording(r: GqlRecordingNode): Recording {
  return {
    id: r.id,
    fileName: r.fileName,
    filePath: r.filePath,
    sha256: r.sha256,
    duration: typeof r.duration === "string" ? r.duration : String(r.duration ?? ""),
    format: gqlAudioFormatToDomain(r.format),
    sourceType: gqlSourceTypeToDomain(r.sourceType),
    status: gqlStatusToDomain(r.status),
    createdAt: r.createdAt,
  };
}
