import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { FileAudio, Mic, Square, Upload } from "lucide-react";
import { toast } from "react-toastify";

import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import Badge from "../../components/Badge";
import { apiFactory } from "../../api";
import { Recording } from "../../domain/Recording";

const recordingApi = apiFactory.createRecordingApi();
const dictationApi = apiFactory.createDictationApi();
import { formatDuration } from "../../core/utils/format";
import {
  DashboardRoot,
  DropzoneRoot,
  DropzoneCopy,
  DropzoneIcon,
  DropzoneTitle,
  DropzoneHint,
  RecordingRow,
  RecordingMeta,
  RecordingName,
  Row,
  SectionTitle,
} from "./Dashboard.style";

type RecordState = "idle" | "starting" | "recording" | "stopping";

interface ActiveSession {
  readonly sessionId: string;
  readonly recorder: MediaRecorder;
  readonly stream: MediaStream;
}

const Dashboard: FC = () => {
  const { t } = useTranslation();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRecordings(await recordingApi.getAll());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploading(true);
      try {
        await recordingApi.upload(files);
        toast.success(`${files.length} → импорт`);
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [refresh]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".m4a", ".wav", ".mp4", ".ogg", ".flac", ".webm", ".aac"],
    },
    noClick: false,
  });

  const pickViaDialog = async () => {
    if (typeof window === "undefined" || !window.mozgoslav) {
      toast.info("Используй drag-and-drop");
      return;
    }
    const result = await window.mozgoslav.openAudioFiles();
    if (result.canceled || !result.filePaths.length) return;
    setUploading(true);
    try {
      await recordingApi.importByPaths(result.filePaths);
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  // BC-004 — Dashboard record button. Flow: start session → capture mic via
  // MediaRecorder (Opus-in-WebM @ 48 kHz, 250 ms chunks) → push each chunk as
  // octet-stream to /api/dictation/{sessionId}/push → stop on second click,
  // fetch the final transcript and render it.
  const startRecording = async () => {
    setRecordState("starting");
    setTranscript(null);
    let sessionId: string | null = null;
    try {
      const started = await dictationApi.start({ source: "dashboard" });
      sessionId = started.sessionId;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 48000 },
      });
      const MediaRecorderCtor = (globalThis as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
      if (!MediaRecorderCtor) {
        throw new Error("MediaRecorder API is not available in this environment");
      }
      const recorder = new MediaRecorderCtor(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 24_000,
      });
      recorder.ondataavailable = (event) => {
        if (!sessionId) return;
        const data = event.data;
        if (!data || (data as Blob).size === 0) return;
        const blob = data as Blob;
        void blob
          .arrayBuffer()
          .then((buf) => dictationApi.push(sessionId!, buf))
          .catch(() => {
            // One-chunk push failures are non-fatal; later chunks still flow.
          });
      };
      sessionRef.current = { sessionId, recorder, stream };
      recorder.start(250); // 250 ms chunks matches ADR-002 D9
      setRecordState("recording");
    } catch (err) {
      setRecordState("idle");
      toast.error(err instanceof Error ? err.message : String(err));
      sessionRef.current = null;
    }
  };

  const stopRecording = async () => {
    const active = sessionRef.current;
    if (!active) {
      setRecordState("idle");
      return;
    }
    setRecordState("stopping");
    try {
      active.recorder.stop();
      active.stream.getTracks().forEach((track) => track.stop());
      const result = await dictationApi.stop(active.sessionId);
      setTranscript(result.transcript);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      sessionRef.current = null;
      setRecordState("idle");
    }
  };

  const toggleRecord = () => {
    if (recordState === "idle") {
      void startRecording();
    } else if (recordState === "recording") {
      void stopRecording();
    }
  };

  // Subscribe to the global dictation hotkey
  // (Cmd/Ctrl+Shift+Space). Electron's main process forwards it via the
  // preload bridge. We kick off the same lifecycle used by the on-page
  // Record button. Unlike the mouse-5 entry the `source` travels via
  // `api.startDictation`; backend decides per-source routing (e.g. which
  // profile to apply).
  useEffect(() => {
    const bridge = typeof window !== "undefined" ? window.mozgoslav : undefined;
    if (!bridge?.onGlobalHotkey) return;
    const unsubscribe = bridge.onGlobalHotkey((payload) => {
      if (sessionRef.current) {
        void stopRecording();
      } else {
        void (async () => {
          setRecordState("starting");
          setTranscript(null);
          try {
            const started = await dictationApi.start({ source: payload.source });
            // Re-use the standard start flow for the mic pipe + chunk push;
            // a second `api.startDictation` call inside `startRecording` is
            // avoided by seeding the session ref after this one returns.
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: { channelCount: 1, sampleRate: 48000 },
            });
            const MediaRecorderCtor = (globalThis as unknown as {
              MediaRecorder?: typeof MediaRecorder;
            }).MediaRecorder;
            if (!MediaRecorderCtor) {
              throw new Error("MediaRecorder API is not available in this environment");
            }
            const recorder = new MediaRecorderCtor(stream, {
              mimeType: "audio/webm;codecs=opus",
              audioBitsPerSecond: 24_000,
            });
            recorder.ondataavailable = (event) => {
              const data = event.data;
              if (!data || (data as Blob).size === 0) return;
              const blob = data as Blob;
              void blob
                .arrayBuffer()
                .then((buf) => dictationApi.push(started.sessionId, buf))
                .catch(() => {});
            };
            sessionRef.current = { sessionId: started.sessionId, recorder, stream };
            recorder.start(250);
            setRecordState("recording");
          } catch (err) {
            setRecordState("idle");
            toast.error(err instanceof Error ? err.message : String(err));
            sessionRef.current = null;
          }
        })();
      }
    });
    return unsubscribe;
  }, []);

  const getFormatLabel = (format: unknown) => {
    if (typeof format === "string") return format.toUpperCase();
    if (typeof format === "number") return String(format);
    return "UNKNOWN";
  };

  return (
    <DashboardRoot>
      <Card title={t("dashboard.importTitle")}>
        <DropzoneRoot {...getRootProps()} $active={isDragActive}>
          <input {...getInputProps()} />
          <DropzoneIcon>
            <Upload size={28} />
          </DropzoneIcon>
          <DropzoneCopy>
            <DropzoneTitle>{t("dashboard.dropzonePrompt")}</DropzoneTitle>
            <DropzoneHint>{t("dashboard.dropzoneHint")}</DropzoneHint>
          </DropzoneCopy>
        </DropzoneRoot>
        <Row>
          <Button
            variant="secondary"
            leftIcon={<FileAudio size={16} />}
            onClick={pickViaDialog}
            isLoading={uploading}
          >
            {t("common.add")}
          </Button>
          <Button
            variant={recordState === "recording" ? "primary" : "ghost"}
            leftIcon={recordState === "recording" ? <Square size={16} /> : <Mic size={16} />}
            data-testid="dashboard-record"
            isLoading={recordState === "starting" || recordState === "stopping"}
            onClick={toggleRecord}
          >
            {recordState === "recording"
              ? t("dashboard.recordStop")
              : t("dashboard.recordStart")}
          </Button>
        </Row>
        {transcript && (
          <div
            data-testid="dashboard-transcript"
            style={{ marginTop: 12, fontSize: 14, color: "#555" }}
          >
            {transcript}
          </div>
        )}
      </Card>

      <SectionTitle>{t("dashboard.recentTitle")}</SectionTitle>
      {recordings.length === 0 ? (
        <EmptyState
          title={t("dashboard.empty")}
          body={t("dashboard.dropzoneHint")}
          icon={<FileAudio size={28} />}
        />
      ) : (
        <Card>
          {recordings.map((r) => (
            <RecordingRow key={r.id}>
              <FileAudio size={18} />
              <RecordingMeta>
                <RecordingName>{r.fileName}</RecordingName>
                <small>
                  {getFormatLabel(r.format)} · {formatDuration(r.duration)}
                </small>
              </RecordingMeta>
              <Badge
                tone={
                  r.status === "Transcribed"
                    ? "success"
                    : r.status === "Failed"
                      ? "error"
                      : "neutral"
                }
              >
                {r.status}
              </Badge>
            </RecordingRow>
          ))}
        </Card>
      )}
    </DashboardRoot>
  );
};

export default Dashboard;
