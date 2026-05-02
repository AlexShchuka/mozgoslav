import { FC } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { DownloadState } from "../../api/gql/graphql";
import Button from "../../components/Button";
import ProgressBar from "../../components/ProgressBar";
import { formatBytes, formatEta } from "../../core/utils/format";
import {
  CloseButton,
  DownloadItem,
  DownloadItemHeader,
  DownloadItemMeta,
  DownloadItemName,
  DrawerBody,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
  EmptyMessage,
  Overlay,
} from "./DownloadsDrawer.style";
import type { DownloadsDrawerProps } from "./types";

const PENDING = "—";

const DownloadsDrawer: FC<DownloadsDrawerProps> = ({
  isOpen,
  downloads,
  cancellingDownloadId,
  onClose,
  onCancel,
}) => {
  const { t } = useTranslation();

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <>
      <Overlay onClick={onClose} data-testid="downloads-drawer-overlay" />
      <DrawerPanel role="dialog" aria-modal="true" data-testid="downloads-drawer">
        <DrawerHeader>
          <DrawerTitle>{t("downloads.title")}</DrawerTitle>
          <CloseButton
            type="button"
            onClick={onClose}
            aria-label="close"
            data-testid="downloads-drawer-close"
          >
            <X size={18} />
          </CloseButton>
        </DrawerHeader>
        <DrawerBody>
          {downloads.length === 0 ? (
            <EmptyMessage data-testid="downloads-empty">{t("downloads.empty")}</EmptyMessage>
          ) : (
            downloads.map((download) => (
              <DownloadEntry
                key={download.id}
                download={download}
                isCancelling={cancellingDownloadId === download.id}
                onCancel={onCancel}
              />
            ))
          )}
        </DrawerBody>
      </DrawerPanel>
    </>,
    document.body
  );
};

interface DownloadEntryProps {
  download: DownloadsDrawerProps["downloads"][number];
  isCancelling: boolean;
  onCancel: (downloadId: string) => void;
}

const DownloadEntry: FC<DownloadEntryProps> = ({ download, isCancelling, onCancel }) => {
  const { t } = useTranslation();

  const isActive =
    download.state === DownloadState.Queued ||
    download.state === DownloadState.Downloading ||
    download.state === DownloadState.Finalizing;

  const isCancellable =
    download.state === DownloadState.Queued || download.state === DownloadState.Downloading;

  const isFailed = download.state === DownloadState.Failed;

  const pct =
    download.totalBytes && download.totalBytes > 0
      ? Math.round((download.bytesReceived / download.totalBytes) * 100)
      : 0;

  const stateLabel = (() => {
    switch (download.state) {
      case DownloadState.Queued:
        return t("downloads.queued");
      case DownloadState.Downloading:
        return t("downloads.downloading");
      case DownloadState.Finalizing:
        return t("downloads.finalizing");
      case DownloadState.Failed:
        return t("downloads.failed");
      case DownloadState.Cancelled:
        return t("downloads.cancelled");
      default:
        return download.state;
    }
  })();

  const speed = download.speedBytesPerSecond ?? 0;
  const speedLabel = speed > 0 ? `${formatBytes(speed)}/s` : PENDING;
  const remaining =
    download.totalBytes && download.totalBytes > download.bytesReceived
      ? download.totalBytes - download.bytesReceived
      : 0;
  const etaLabel = speed > 0 && remaining > 0 ? formatEta(remaining, speed) : PENDING;

  return (
    <DownloadItem data-testid={`download-item-${download.id}`}>
      <DownloadItemHeader>
        <DownloadItemName title={download.catalogueId}>{download.catalogueId}</DownloadItemName>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            disabled={!isCancellable}
            isLoading={isCancelling}
            onClick={() => onCancel(download.id)}
            data-testid={`download-cancel-${download.id}`}
          >
            {t("downloads.cancel")}
          </Button>
        )}
      </DownloadItemHeader>
      <ProgressBar
        value={pct}
        status={isFailed ? "error" : isActive ? "active" : "success"}
        indeterminate={download.state === DownloadState.Queued}
        label={
          download.state === DownloadState.Failed
            ? (download.errorMessage ?? t("downloads.failed"))
            : undefined
        }
      />
      <DownloadItemMeta>
        <span>{stateLabel}</span>
        <span>
          {download.totalBytes
            ? `${formatBytes(download.bytesReceived)} / ${formatBytes(download.totalBytes)}`
            : formatBytes(download.bytesReceived)}
        </span>
      </DownloadItemMeta>
      <DownloadItemMeta>
        <span data-testid={`download-speed-${download.id}`}>{speedLabel}</span>
        <span data-testid={`download-eta-${download.id}`}>{etaLabel}</span>
      </DownloadItemMeta>
    </DownloadItem>
  );
};

export default DownloadsDrawer;
