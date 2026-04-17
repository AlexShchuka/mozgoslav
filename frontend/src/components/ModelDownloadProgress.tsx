import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

import ProgressBar from "./ProgressBar";
import Button from "./Button";
import { BACKEND_URL, API_ENDPOINTS } from "../constants/api";

export interface ModelDownloadProgressProps {
  downloadId: string;
  label?: string;
  onCancel?: (downloadId: string) => void;
  onComplete?: (downloadId: string) => void;
}

interface DownloadFrame {
  downloadId: string;
  totalBytes: number;
  receivedBytes: number;
  status: "pending" | "downloading" | "done" | "failed";
  error?: string | null;
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const formatMb = (bytes: number): string =>
  bytes > 0 ? `${(bytes / (1024 * 1024)).toFixed(1)} МБ` : "—";

// Bug 26 — subscribes to `GET /api/models/download/stream?downloadId=…` SSE.
// Re-used by the Get-Started Models step and Settings → Models page so the
// user sees bytes/total + progress while the backend pulls the Whisper/VAD
// model from HuggingFace.
const ModelDownloadProgress: FC<ModelDownloadProgressProps> = ({
  downloadId,
  label,
  onCancel,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [frame, setFrame] = useState<DownloadFrame | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const url = `${BACKEND_URL}${API_ENDPOINTS.modelsDownloadStream}?downloadId=${encodeURIComponent(downloadId)}`;
    const source = new EventSource(url);
    const handle = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as DownloadFrame;
        setFrame(parsed);
        if (parsed.status === "done") {
          onComplete?.(parsed.downloadId);
          source.close();
          setClosed(true);
        }
        if (parsed.status === "failed") {
          source.close();
          setClosed(true);
        }
      } catch {
        // swallow malformed frames
      }
    };
    source.addEventListener("progress", handle);
    source.onmessage = handle;
    source.onerror = () => {
      // EventSource auto-retries; we keep the component mounted until the
      // parent unmounts us.
    };
    return () => {
      source.close();
      setClosed(true);
    };
  }, [downloadId, onComplete]);

  if (closed && !frame) return null;

  const pct =
    frame && frame.totalBytes > 0
      ? Math.round((frame.receivedBytes / frame.totalBytes) * 100)
      : 0;
  const errored = frame?.status === "failed";

  return (
    <Root data-testid={`model-download-${downloadId}`}>
      <Meta>
        <span>{label ?? t("models.download")}</span>
        <span>
          {frame ? `${formatMb(frame.receivedBytes)} / ${formatMb(frame.totalBytes)}` : "…"}
        </span>
      </Meta>
      <ProgressBar
        value={pct}
        status={errored ? "error" : frame?.status === "done" ? "success" : "active"}
        indeterminate={!frame || frame.totalBytes === 0}
        label={errored ? (frame?.error ?? t("common.error")) : undefined}
      />
      {onCancel && frame?.status !== "done" && (
        <Button
          variant="ghost"
          data-testid={`model-download-cancel-${downloadId}`}
          onClick={() => onCancel(downloadId)}
        >
          {t("common.cancel")}
        </Button>
      )}
    </Root>
  );
};

export default ModelDownloadProgress;
