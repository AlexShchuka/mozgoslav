import {FC, useCallback, useEffect, useRef, useState} from "react";
import {useDropzone} from "react-dropzone";
import {useTranslation} from "react-i18next";
import {FileAudio, Mic, Square, Upload} from "lucide-react";
import {toast} from "react-toastify";

import AudioLevelMeter from "../../components/AudioLevelMeter";
import Button from "../../components/Button";
import Card from "../../components/Card";
import {apiFactory} from "../../api";
import {API_ENDPOINTS, BACKEND_URL} from "../../constants/api";
import {GLOBAL_HOTKEY_REDISPATCH_EVENT, RECORDINGS_CHANGED_EVENT} from "../../constants/events";
import {usePushToTalk} from "../../hooks/usePushToTalk";
import {
    DashboardRoot,
    DropzoneCopy,
    DropzoneHint,
    DropzoneIcon,
    DropzoneRoot,
    DropzoneTitle,
    Row,
} from "./Dashboard.style";

const recordingApi = apiFactory.createRecordingApi();
const dictationApi = apiFactory.createDictationApi();

type RecordState = "idle" | "starting" | "recording" | "stopping";

interface ActiveSession {
    readonly sessionId: string;
    readonly recorder: MediaRecorder;
    readonly stream: MediaStream;
    /**
     * When true (Dashboard "Записать" button path), accumulated webm chunks
     * are uploaded on stop so a Recording row is created and the full
     * pipeline runs. When false (push-to-talk dictation hotkey), the session
     * is ephemeral — finalised text is injected into the focused app and the
     * audio is discarded.
     */
    readonly persistOnStop: boolean;
}

const notifyRecordingsChanged = (): void => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(RECORDINGS_CHANGED_EVENT));
    }
};

/**
 * Dashboard — record controls + audio-import surface. No more embedded
 * "recent recordings" list: the single unified HomeList below owns that
 * view (2026-04-19 meeting note — one list of files, not two views of the
 * same thing).
 */
const Dashboard: FC = () => {
    const {t} = useTranslation();
    const [uploading, setUploading] = useState(false);
    const [recordState, setRecordState] = useState<RecordState>("idle");
    const [transcript, setTranscript] = useState<string | null>(null);
    const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
    const sessionRef = useRef<ActiveSession | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.EventSource === "undefined") {
            return undefined;
        }
        const es = new EventSource(`${BACKEND_URL}${API_ENDPOINTS.devicesStream}`);
        es.addEventListener("device-changed", (event) => {
            try {
                const payload = JSON.parse((event as MessageEvent).data) as {
                    kind: string;
                    devices: { id: string; name: string; isDefault: boolean }[];
                };
                if (payload.kind === "snapshot") return;
                const defaultName =
                    payload.devices.find((d) => d.isDefault)?.name ??
                    payload.devices[0]?.name ??
                    t("dashboard.deviceUnknown");
                toast.info(
                    t("dashboard.deviceChanged", {kind: payload.kind, name: defaultName}),
                );
            } catch {
            }
        });
        return () => es.close();
    }, [t]);

    const onDrop = useCallback(
        async (files: File[]) => {
            if (!files.length) return;
            setUploading(true);
            try {
                await recordingApi.upload(files);
                toast.success(`${files.length} → импорт`);
                notifyRecordingsChanged();
            } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err));
            } finally {
                setUploading(false);
            }
        },
        [],
    );

    const {getRootProps, getInputProps, isDragActive} = useDropzone({
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
            const started = await dictationApi.start({source: "dashboard"});
            sessionId = started.sessionId;

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {channelCount: 1, sampleRate: 48000},
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
                if (!sessionId) return;
                const data = event.data;
                if (!data || (data as Blob).size === 0) return;
                const blob = data as Blob;
                if (persistOnStop) {
                    chunksRef.current.push(blob);
                }
                void blob
                    .arrayBuffer()
                    .then((buf) => dictationApi.push(sessionId!, buf))
                    .catch(() => {
                    });
            };
            sessionRef.current = {sessionId, recorder, stream, persistOnStop};
            setActiveStream(stream);
            recorder.start(250); // 250 ms chunks matches ADR-002 D9
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
                active.recorder.addEventListener("stop", () => resolve(), {once: true});
            });
            active.recorder.stop();
            active.stream.getTracks().forEach((track) => track.stop());
            await stopped;

            try {
                const result = await dictationApi.stop(active.sessionId);
                setTranscript(result.polishedText);
                if (!active.persistOnStop && result.polishedText) {
                    try {
                        await window.mozgoslav?.dictationInject?.(result.polishedText, "auto");
                    } catch (injectErr) {
                        console.warn("[dictation] inject failed:", injectErr);
                    }
                }
            } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err));
            }

            if (active.persistOnStop && chunksRef.current.length > 0) {
                const blob = new Blob(chunksRef.current, {type: "audio/webm"});
                const fileName = `recording-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
                const file = new File([blob], fileName, {type: "audio/webm"});
                try {
                    await recordingApi.upload([file]);
                    notifyRecordingsChanged();
                    toast.success(t("dashboard.recordedSaved"));
                } catch (err) {
                    toast.error(err instanceof Error ? err.message : String(err));
                }
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
            const detail = (event as CustomEvent<{source: string}>).detail;
            console.info("[hotkey] Dashboard received redispatch:", detail);
            if (sessionRef.current) {
                void stopRecording();
            } else {
                void (async () => {
                    setRecordState("starting");
                    setTranscript(null);
                    try {
                        const started = await dictationApi.start({source: detail.source});
                        const stream = await navigator.mediaDevices.getUserMedia({
                            audio: {channelCount: 1, sampleRate: 48000},
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
                                .catch(() => {
                                });
                        };
                        sessionRef.current = {
                            sessionId: started.sessionId,
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
                        <Upload size={28}/>
                    </DropzoneIcon>
                    <DropzoneCopy>
                        <DropzoneTitle>{t("dashboard.dropzonePrompt")}</DropzoneTitle>
                        <DropzoneHint>{t("dashboard.dropzoneHint")}</DropzoneHint>
                    </DropzoneCopy>
                </DropzoneRoot>
                <Row>
                    <Button
                        variant="secondary"
                        leftIcon={<FileAudio size={16}/>}
                        onClick={pickViaDialog}
                        isLoading={uploading}
                    >
                        {t("common.add")}
                    </Button>
                    <Button
                        variant={recordState === "recording" ? "primary" : "ghost"}
                        leftIcon={recordState === "recording" ? <Square size={16}/> : <Mic size={16}/>}
                        data-testid="dashboard-record"
                        isLoading={recordState === "starting" || recordState === "stopping"}
                        onClick={toggleRecord}
                    >
                        {recordState === "recording"
                            ? t("dashboard.recordStop")
                            : t("dashboard.recordStart")}
                    </Button>
                </Row>
                {recordState === "recording" && activeStream && (
                    <div style={{marginTop: 12}} data-testid="dashboard-levels">
                        <AudioLevelMeter
                            stream={activeStream}
                            ariaLabel={t("dashboard.audioLevel")}
                        />
                    </div>
                )}
                {transcript && (
                    <div
                        data-testid="dashboard-transcript"
                        style={{marginTop: 12, fontSize: 14, color: "#555"}}
                    >
                        {transcript}
                    </div>
                )}
            </Card>
        </DashboardRoot>
    );
};

export default Dashboard;
