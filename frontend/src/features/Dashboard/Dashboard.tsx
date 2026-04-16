import { FC, useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { FileAudio, Mic, Upload } from "lucide-react";
import { toast } from "react-toastify";

import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import Badge from "../../components/Badge";
import { api } from "../../api/MozgoslavApi";
import { Recording } from "../../models/Recording";
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

const Dashboard: FC = () => {
  const { t } = useTranslation();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRecordings(await api.listRecordings());
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
        await api.uploadFiles(files);
        toast.success(`${files.length} → импорт`);
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [refresh],
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
      await api.importByPaths(result.filePaths);
      await refresh();
    } finally {
      setUploading(false);
    }
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
          <Button variant="ghost" leftIcon={<Mic size={16} />} disabled>
            {t("dashboard.recordStart")} — {t("dashboard.recordUnsupported")}
          </Button>
        </Row>
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
                  {r.format.toUpperCase()} · {formatDuration(r.duration)}
                </small>
              </RecordingMeta>
              <Badge tone={r.status === "Transcribed" ? "success" : r.status === "Failed" ? "error" : "neutral"}>
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
