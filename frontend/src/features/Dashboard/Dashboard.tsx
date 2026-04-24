import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { FileAudio, Mic, Square, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { print } from "graphql";

import AudioLevelMeter from "../../components/AudioLevelMeter";
import Button from "../../components/Button";
import Card from "../../components/Card";

import { SubscriptionAudioDeviceChangedDocument } from "../../api/gql/graphql";
import type { SubscriptionAudioDeviceChangedSubscription } from "../../api/gql/graphql";
import {
  MutationDictationStartDocument,
  MutationDictationStopDocument,
  MutationImportRecordingsDocument,
  MutationUploadRecordingsDocument,
} from "../../api/gql/graphql";
import { graphqlClient, getGraphqlWsClient } from "../../api/graphqlClient";
import { pushDictationAudio } from "../../api/dictationPush";
import { GLOBAL_HOTKEY_REDISPATCH_EVENT, RECORDINGS_CHANGED_EVENT } from "../../constants/events";
import { usePushToTalk } from "../../hooks/usePushToTalk";
import {
  DashboardRoot,
  DropzoneCopy,
  DropzoneHint,
  DropzoneIcon,
  DropzoneRoot,
  DropzoneTitle,
  Row,
} from "./Dashboard.style";

type RecordState = "idle" | "starting" | "recording" | "stopping";

interface ActiveSession {
  readonly sessionId: string;
  readonly recorder: MediaRecorder;
  readonly stream: MediaStream;
  readonly persistOnStop: boolean;
}

const notifyRecordingsChanged = (): void => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RECORDINGS_CHANGED_EVENT));
  }
};

const Dashboard: FC = () => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const wsClient = getGraphqlWsClient();
    const unsubscribe = wsClient.subscribe<SubscriptionAudioDeviceChangedSubscription>(
      { query: print(SubscriptionAudioDeviceChangedDocument) },
      {
        next: (value) => {
          if (!value.data) return;
          const payload = value.data.audioDeviceChanged;
          if (payload.kind === "snapshot") return;
          const defaultName =
            payload.devices.find((d) => d.isDefault)?.name ??
            payload.devices[0]?.name ??
            t("dashboard.deviceUnknown");
          toast.info(t("dashboard.deviceChanged", { kind: payload.kind, name: defaultName }));
        },
        error: () => {},
        complete: () => {},
      }
    );
    return () => {
      unsubscribe();
      void wsClient.dispose();
    };
  }, [t]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const filePaths = files.map((f) => (f as File & { path?: string }).path).filter(Boolean) as string[];
    if (!filePaths.length) {
      toast.info(t("dashboard.dropRequiresElectron"));
      return;
    }
    setUploading(true);
    try {
      await graphqlClient.request(MutationUploadRecordingsDocument, { input: { filePaths } });
      toast.success(`${files.length} → импорт`);
      notifyRecordingsChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }, [t]);

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
      await graphqlClient.request(MutationImportRecordingsDocument, {
        input: { filePaths: result.filePaths },
      });
      notifyRecordingsChanged();
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async (persistOnStop: boolean = false) => {
    setRecordState("starting");
    setTranscript(null);
    chunksRef.current = [];
    let sessionId: string | null = null;
    try {
      const data = await graphqlClient.request(MutationDictationStartDocument, {
        source: "dashboard",
      });
      sessionId = data.dictationStart.sessionId ?? null;
      if (!sessionId) throw new Error("dictation start failed");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 48000 },
      });
      const MediaRecorderCtor = (
        globalThis as unknown as {
          MediaRecorder?: typeof MediaRecorder;
        }
      ).MediaRecorder;
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
        if (persistOnStop) {
          chunksRef.current.push(blob);
        }
        void blob
          .arrayBuffer()
          .then((buf) => pushDictationAudio(sessionId!, buf))
          .catch(() => {});
      };
      sessionRef.current = { sessionId, recorder, stream, persistOnStop };
      setActiveStream(stream);
      recorder.start(250);
      setRecordState("recording");
    } catch (err) {
      setRecordState("idle");
      toast.error(err instanceof Error ? err.message : String(err));
      sessionRef.current = null;
      setActiveStream(null);
      chunksRef.current = [];
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
      const stopped = new Promise<void>((resolve) => {
        active.recorder.addEventListener("stop", () => resolve(), { once: true });
      });
      active.recorder.stop();
      active.stream.getTracks().forEach((track) => track.stop());
      await stopped;

      try {
        const data = await graphqlClient.request(MutationDictationStopDocument, {
          sessionId: active.sessionId,
        });
        const polishedText = data.dictationStop.polishedText ?? null;
        setTranscript(polishedText);
        if (!active.persistOnStop && polishedText) {
          try {
            await window.mozgoslav?.dictationInject?.(polishedText, "auto");
          } catch (injectErr) {
            console.warn("[dictation] inject failed:", injectErr);
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }

      if (active.persistOnStop && chunksRef.current.length > 0) {
        notifyRecordingsChanged();
        toast.success(t("dashboard.recordedSaved"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      chunksRef.current = [];
      sessionRef.current = null;
      setActiveStream(null);
      setRecordState("idle");
    }
  };

  const toggleRecord = () => {
    if (recordState === "idle") {
      void startRecording(true);
    } else if (recordState === "recording") {
      void stopRecording();
    }
  };

  useEffect(() => {
    const handleGlobalHotkey = (event: Event) => {
      const detail = (event as CustomEvent<{ source: string }>).detail;
      console.info("[hotkey] Dashboard received redispatch:", detail);
      if (sessionRef.current) {
        void stopRecording();
      } else {
        void (async () => {
          setRecordState("starting");
          setTranscript(null);
          try {
            const startData = await graphqlClient.request(MutationDictationStartDocument, {
              source: detail.source,
            });
            const sessionId = startData.dictationStart.sessionId;
            if (!sessionId) throw new Error("dictation start failed");
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: { channelCount: 1, sampleRate: 48000 },
            });
            const MediaRecorderCtor = (
              globalThis as unknown as {
                MediaRecorder?: typeof MediaRecorder;
              }
            ).MediaRecorder;
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
                .then((buf) => pushDictationAudio(sessionId, buf))
                .catch(() => {});
            };
            sessionRef.current = {
              sessionId,
              recorder,
              stream,
              persistOnStop: false,
            };
            setActiveStream(stream);
            recorder.start(250);
            setRecordState("recording");
          } catch (err) {
            setRecordState("idle");
            toast.error(err instanceof Error ? err.message : String(err));
            sessionRef.current = null;
            setActiveStream(null);
          }
        })();
      }
    };
    window.addEventListener(GLOBAL_HOTKEY_REDISPATCH_EVENT, handleGlobalHotkey);
    return () => window.removeEventListener(GLOBAL_HOTKEY_REDISPATCH_EVENT, handleGlobalHotkey);
  }, []);

  usePushToTalk({
    onPress: () => {
      if (!sessionRef.current) void startRecording(false);
    },
    onRelease: () => {
      if (sessionRef.current) void stopRecording();
    },
  });

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
            {recordState === "recording" ? t("dashboard.recordStop") : t("dashboard.recordStart")}
          </Button>
        </Row>
        {recordState === "recording" && activeStream && (
          <div style={{ marginTop: 12 }} data-testid="dashboard-levels">
            <AudioLevelMeter stream={activeStream} ariaLabel={t("dashboard.audioLevel")} />
          </div>
        )}
        {transcript && (
          <div
            data-testid="dashboard-transcript"
            style={{ marginTop: 12, fontSize: 14, color: "#555" }}
          >
            {transcript}
          </div>
        )}
      </Card>
    </DashboardRoot>
  );
};

export default Dashboard;
