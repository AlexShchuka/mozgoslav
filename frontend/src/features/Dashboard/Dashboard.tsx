import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { FileAudio, Mic, Square, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import type { Dispatch } from "redux";
import type { AnyAction } from "redux";

import AudioLevelMeter from "../../components/AudioLevelMeter";
import Button from "../../components/Button";
import Card from "../../components/Card";

import { pushDictationAudio } from "../../api/dictationPush";
import { GLOBAL_HOTKEY_REDISPATCH_EVENT, RECORDINGS_CHANGED_EVENT } from "../../constants/events";
import { usePushToTalk } from "../../hooks/usePushToTalk";
import {
  dictationStartRequested,
  dictationStopRequested,
  dictationReset,
  dictationFailed,
  selectDictationStatus,
} from "../../store/slices/dictation";
import {
  uploadRecordingsRequested,
  importRecordingsRequested,
  selectIsUploading,
  selectLastUploadError,
} from "../../store/slices/recording";
import { selectLastAudioDeviceChange } from "../../store/slices/audioDevices";
import {
  DashboardRoot,
  DropzoneCopy,
  DropzoneHint,
  DropzoneIcon,
  DropzoneRoot,
  DropzoneTitle,
  Row,
} from "./Dashboard.style";

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
  const dispatch = useDispatch<Dispatch<AnyAction>>();
  const status = useSelector(selectDictationStatus);
  const isUploading = useSelector(selectIsUploading);
  const lastUploadError = useSelector(selectLastUploadError);
  const lastChange = useSelector(selectLastAudioDeviceChange);

  const [transcript, setTranscript] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastSeenChangeIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lastChange) return;
    if (lastSeenChangeIdRef.current === lastChange.id) return;
    lastSeenChangeIdRef.current = lastChange.id;
    toast.info(
      t("dashboard.deviceChanged", { kind: lastChange.kind, name: lastChange.defaultName })
    );
  }, [lastChange, t]);

  useEffect(() => {
    if (!lastUploadError) return;
    toast.error(lastUploadError);
  }, [lastUploadError]);

  useEffect(() => {
    if (status.phase !== "active") return;
    if (sessionRef.current?.sessionId === status.sessionId) return;

    const { sessionId, persistOnStop } = status;
    let mounted = true;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, sampleRate: 48000 },
        });
        if (!mounted) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        const MediaRecorderCtor = (
          globalThis as unknown as { MediaRecorder?: typeof MediaRecorder }
        ).MediaRecorder;
        if (!MediaRecorderCtor) {
          throw new Error("MediaRecorder API is not available in this environment");
        }
        const recorder = new MediaRecorderCtor(stream, {
          mimeType: "audio/webm;codecs=opus",
          audioBitsPerSecond: 24_000,
        });
        recorder.ondataavailable = (event) => {
          const data = event.data as Blob | undefined;
          if (!data || data.size === 0) return;
          if (persistOnStop) chunksRef.current.push(data);
          void data
            .arrayBuffer()
            .then((buf) => pushDictationAudio(sessionId, buf))
            .catch(() => {});
        };
        sessionRef.current = { sessionId, recorder, stream, persistOnStop };
        setActiveStream(stream);
        recorder.start(250);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
        dispatch(dictationFailed({ error: err instanceof Error ? err.message : String(err) }));
        sessionRef.current = null;
        setActiveStream(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [status, dispatch]);

  useEffect(() => {
    if (status.phase !== "stopped") return;
    const { polishedText, persistOnStop } = status;
    const hadChunks = chunksRef.current.length > 0;
    setTranscript(polishedText);
    void (async () => {
      if (!persistOnStop && polishedText) {
        try {
          await window.mozgoslav?.dictationInject?.(polishedText, "auto");
        } catch {}
      }
      if (persistOnStop && hadChunks) {
        notifyRecordingsChanged();
        toast.success(t("dashboard.recordedSaved"));
      }
      chunksRef.current = [];
      sessionRef.current = null;
      setActiveStream(null);
      dispatch(dictationReset());
    })();
  }, [status, dispatch, t]);

  useEffect(() => {
    if (status.phase !== "failed") return;
    const { error } = status;
    toast.error(error);
    chunksRef.current = [];
    sessionRef.current = null;
    setActiveStream(null);
    dispatch(dictationReset());
  }, [status, dispatch]);

  const stopRecording = useCallback(async () => {
    const active = sessionRef.current;
    if (!active) {
      dispatch(dictationReset());
      return;
    }
    try {
      const stopped = new Promise<void>((resolve) => {
        active.recorder.addEventListener("stop", () => resolve(), { once: true });
      });
      active.recorder.stop();
      active.stream.getTracks().forEach((track) => track.stop());
      await stopped;
    } catch {}
    dispatch(dictationStopRequested());
  }, [dispatch]);

  const toggleRecord = () => {
    if (status.phase === "idle") {
      dispatch(dictationStartRequested({ source: "dashboard", persistOnStop: true }));
    } else if (status.phase === "active") {
      void stopRecording();
    }
  };

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const filePaths = files
        .map((f) => (f as File & { path?: string }).path)
        .filter(Boolean) as string[];
      if (!filePaths.length) {
        toast.info(t("dashboard.dropRequiresElectron"));
        return;
      }
      dispatch(uploadRecordingsRequested({ filePaths }));
    },
    [dispatch, t]
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
    dispatch(importRecordingsRequested({ filePaths: result.filePaths }));
  };

  useEffect(() => {
    const handleGlobalHotkey = (event: Event) => {
      const detail = (event as CustomEvent<{ source: string }>).detail;
      if (sessionRef.current) {
        void stopRecording();
      } else {
        dispatch(dictationStartRequested({ source: detail.source, persistOnStop: false }));
      }
    };
    window.addEventListener(GLOBAL_HOTKEY_REDISPATCH_EVENT, handleGlobalHotkey);
    return () => window.removeEventListener(GLOBAL_HOTKEY_REDISPATCH_EVENT, handleGlobalHotkey);
  }, [dispatch, stopRecording]);

  usePushToTalk({
    onPress: () => {
      if (!sessionRef.current) {
        dispatch(dictationStartRequested({ source: "push-to-talk", persistOnStop: false }));
      }
    },
    onRelease: () => {
      if (sessionRef.current) void stopRecording();
    },
  });

  const isRecording = status.phase === "active";
  const isTransitioning = status.phase === "starting" || status.phase === "stopping";

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
            isLoading={isUploading}
          >
            {t("common.add")}
          </Button>
          <Button
            variant={isRecording ? "primary" : "ghost"}
            leftIcon={isRecording ? <Square size={16} /> : <Mic size={16} />}
            data-testid="dashboard-record"
            isLoading={isTransitioning}
            onClick={toggleRecord}
          >
            {isRecording ? t("dashboard.recordStop") : t("dashboard.recordStart")}
          </Button>
        </Row>
        {isRecording && activeStream && (
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
