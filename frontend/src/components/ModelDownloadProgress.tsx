import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { print } from "graphql";

import ProgressBar from "./ProgressBar";
import Button from "./Button";
import type { SubscriptionModelDownloadProgressSubscription } from "../api/gql/graphql";
import { SubscriptionModelDownloadProgressDocument } from "../api/gql/graphql";
import { getGraphqlWsClient } from "../api/graphqlClient";

export interface ModelDownloadProgressProps {
  downloadId: string;
  label?: string;
  onCancel?: (downloadId: string) => void;
  onComplete?: (downloadId: string) => void;
}

interface ProgressState {
  bytesRead: number;
  totalBytes: number | null;
  done: boolean;
  error: string | null;
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg.elevated2};
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const formatMb = (bytes: number): string =>
  bytes > 0 ? `${(bytes / (1024 * 1024)).toFixed(1)} МБ` : "—";

const ModelDownloadProgress: FC<ModelDownloadProgressProps> = ({
  downloadId,
  label,
  onCancel,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const wsClient = getGraphqlWsClient();
    const unsubscribe = wsClient.subscribe<SubscriptionModelDownloadProgressSubscription>(
      {
        query: print(SubscriptionModelDownloadProgressDocument),
        variables: { downloadId },
      },
      {
        next: (value) => {
          const evt = value.data?.modelDownloadProgress;
          if (!evt) return;
          setProgress({
            bytesRead: Number(evt.bytesRead),
            totalBytes: evt.totalBytes != null ? Number(evt.totalBytes) : null,
            done: evt.done,
            error: evt.error ?? null,
          });
          if (evt.done) {
            onComplete?.(downloadId);
            setClosed(true);
          }
        },
        error: () => {
          setClosed(true);
        },
        complete: () => {
          setClosed(true);
        },
      }
    );
    return () => {
      unsubscribe();
      void wsClient.dispose();
    };
  }, [downloadId, onComplete]);

  if (closed && !progress) return null;

  const pct =
    progress && progress.totalBytes && progress.totalBytes > 0
      ? Math.round((progress.bytesRead / progress.totalBytes) * 100)
      : 0;
  const errored = progress?.error != null;

  return (
    <Root data-testid={`model-download-${downloadId}`}>
      <Meta>
        <span>{label ?? t("models.download")}</span>
        <span>
          {progress
            ? `${formatMb(progress.bytesRead)} / ${formatMb(progress.totalBytes ?? 0)}`
            : "…"}
        </span>
      </Meta>
      <ProgressBar
        value={pct}
        status={errored ? "error" : progress?.done ? "success" : "active"}
        indeterminate={!progress || !progress.totalBytes || progress.totalBytes === 0}
        label={errored ? (progress?.error ?? t("common.error")) : undefined}
      />
      {onCancel && !progress?.done && (
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
