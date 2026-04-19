import {FC, useEffect} from "react";
import {useTranslation} from "react-i18next";
import {QRCodeSVG} from "qrcode.react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import type {SyncPairingPayload, SyncPendingDevice, SyncStatusSnapshot,} from "../../store/slices/sync/types";

import {
    DeviceId,
    ErrorBanner,
    FolderList,
    PendingItem,
    QrBox,
    QrFrame,
    QrMeta,
    Root,
    StatusGrid,
    StatusRow,
} from "./SyncPairing.style";

export interface SyncPairingProps {
    readonly status: SyncStatusSnapshot | null;
    readonly pairing: SyncPairingPayload | null;
    readonly pendingDevices: readonly SyncPendingDevice[];
    readonly streamConnected: boolean;
    readonly isLoadingStatus: boolean;
    readonly isLoadingPairing: boolean;
    readonly acceptingDeviceId: string | null;
    readonly statusError: string | null;
    readonly pairingError: string | null;
    readonly acceptError: string | null;
    readonly loadStatus: () => void;
    readonly loadPairing: () => void;
    readonly acceptDevice: (device: SyncPendingDevice) => void;
    readonly startEventStream: () => void;
    readonly stopEventStream: () => void;
}

const SyncPairing: FC<SyncPairingProps> = ({
                                               status,
                                               pairing,
                                               pendingDevices,
                                               streamConnected,
                                               isLoadingStatus,
                                               isLoadingPairing,
                                               acceptingDeviceId,
                                               statusError,
                                               pairingError,
                                               acceptError,
                                               loadStatus,
                                               loadPairing,
                                               acceptDevice,
                                               startEventStream,
                                               stopEventStream,
                                           }) => {
    const {t} = useTranslation();

    useEffect(() => {
        loadStatus();
        loadPairing();
        startEventStream();
        return () => {
            stopEventStream();
        };
    }, [loadStatus, loadPairing, startEventStream, stopEventStream]);

    return (
        <Root>
            <Card
                title={t("sync.pairing.title")}
                subtitle={t("sync.pairing.subtitle")}
                headerAction={
                    <Badge tone={streamConnected ? "success" : "neutral"}>
                        {streamConnected ? t("sync.live") : t("sync.offline")}
                    </Badge>
                }
            >
                {pairingError && <ErrorBanner>{pairingError}</ErrorBanner>}
                {pairing ? (
                    <QrBox>
                        <QrFrame>
                            <QRCodeSVG value={pairing.uri} size={180} level="M" includeMargin/>
                        </QrFrame>
                        <QrMeta>
                            <div>
                                <strong>{t("sync.pairing.deviceId")}</strong>
                                <br/>
                                <DeviceId>{pairing.deviceId}</DeviceId>
                            </div>
                            <div>
                                <strong>{t("sync.pairing.folders")}</strong>
                                <FolderList>
                                    {pairing.folderIds.map((f) => (
                                        <li key={f}>
                                            <Badge tone="neutral">{f}</Badge>
                                        </li>
                                    ))}
                                </FolderList>
                            </div>
                            <Button variant="secondary" onClick={loadPairing} isLoading={isLoadingPairing}>
                                {t("common.retry")}
                            </Button>
                        </QrMeta>
                    </QrBox>
                ) : (
                    <Button variant="primary" onClick={loadPairing} isLoading={isLoadingPairing}>
                        {t("sync.pairing.load")}
                    </Button>
                )}
            </Card>

            <Card
                title={t("sync.status.title")}
                subtitle={t("sync.status.subtitle")}
                headerAction={
                    <Button variant="secondary" onClick={loadStatus} isLoading={isLoadingStatus}>
                        {t("common.retry")}
                    </Button>
                }
            >
                {statusError && <ErrorBanner>{statusError}</ErrorBanner>}
                {status ? (
                    <StatusGrid>
                        <div>
                            <strong>{t("sync.status.folders")}</strong>
                            {status.folders.length === 0 ? (
                                <StatusRow>
                                    <span>{t("common.empty")}</span>
                                </StatusRow>
                            ) : (
                                status.folders.map((f) => (
                                    <StatusRow key={f.id}>
                                        <span>{f.id}</span>
                                        <span>
                      {f.completionPct.toFixed(0)}% · {f.state}
                                            {f.conflicts > 0 ? ` · ⚠ ${f.conflicts}` : ""}
                    </span>
                                    </StatusRow>
                                ))
                            )}
                        </div>
                        <div>
                            <strong>{t("sync.status.devices")}</strong>
                            {status.devices.length === 0 ? (
                                <StatusRow>
                                    <span>{t("common.empty")}</span>
                                </StatusRow>
                            ) : (
                                status.devices.map((d) => (
                                    <StatusRow key={d.id}>
                                        <span>{d.name || d.id.slice(0, 8)}</span>
                                        <Badge tone={d.connected ? "success" : "neutral"}>
                                            {d.connected ? t("sync.device.online") : t("sync.device.offline")}
                                        </Badge>
                                    </StatusRow>
                                ))
                            )}
                        </div>
                    </StatusGrid>
                ) : (
                    !statusError && <span>{t("common.loading")}</span>
                )}
            </Card>

            <Card title={t("sync.pending.title")} subtitle={t("sync.pending.subtitle")}>
                {acceptError && <ErrorBanner>{acceptError}</ErrorBanner>}
                {pendingDevices.length === 0 ? (
                    <span>{t("sync.pending.empty")}</span>
                ) : (
                    pendingDevices.map((device) => (
                        <PendingItem key={device.deviceId}>
                            <div>
                                <div>
                                    <strong>{device.name || t("sync.pending.unknown")}</strong>
                                </div>
                                <DeviceId>{device.deviceId}</DeviceId>
                            </div>
                            <Button
                                variant="primary"
                                isLoading={acceptingDeviceId === device.deviceId}
                                onClick={() => acceptDevice(device)}
                            >
                                {t("sync.pending.accept")}
                            </Button>
                        </PendingItem>
                    ))
                )}
            </Card>
        </Root>
    );
};

export default SyncPairing;
