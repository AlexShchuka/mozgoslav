import { FC, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";
import styled from "styled-components";

import ProgressBar from "./ProgressBar";
import Button from "./Button";
import {
  selectDownloadProgress,
  subscribeModelDownload,
  unsubscribeModelDownload,
} from "../store/slices/models";

export interface ModelDownloadProgressProps {
  downloadId: string;
  label?: string;
  onCancel?: (downloadId: string) => void;
  onComplete?: (downloadId: string) => void;
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

const ModelDownloadProgress: FC<ModelDownloadProgressProps> = ({ downloadId, label, onCancel }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<Action>>();
  const progress = useSelector(selectDownloadProgress(downloadId));
  const hadProgress = useRef(false);

  useEffect(() => {
    dispatch(subscribeModelDownload(downloadId));
    return () => {
      dispatch(unsubscribeModelDownload(downloadId));
    };
  }, [downloadId, dispatch]);

  if (progress !== null) {
    hadProgress.current = true;
  }

  if (hadProgress.current && progress === null) {
    return null;
  }

  if (progress === null) {
    return null;
  }

  const pct =
    progress.totalBytes && progress.totalBytes > 0
      ? Math.round((progress.bytesRead / progress.totalBytes) * 100)
      : 0;
  const errored = progress.error != null;

  return (
    <Root data-testid={`model-download-${downloadId}`}>
      <Meta>
        <span>{label ?? t("models.download")}</span>
        <span>{`${formatMb(progress.bytesRead)} / ${formatMb(progress.totalBytes ?? 0)}`}</span>
      </Meta>
      <ProgressBar
        value={pct}
        status={errored ? "error" : progress.done ? "success" : "active"}
        indeterminate={!progress.totalBytes || progress.totalBytes === 0}
        label={errored ? (progress.error ?? t("common.error")) : undefined}
      />
      {onCancel && !progress.done && (
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
