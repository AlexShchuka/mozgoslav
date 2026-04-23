import { FC, useState } from "react";
import { useTranslation } from "react-i18next";

import Badge from "../../../components/Badge";
import Button from "../../../components/Button";
import Modal from "../../../components/Modal";
import SyncPairing from "../../SyncPairing";
import type { SyncStatusSnapshot } from "../../../store/slices/sync/types";
import { DeviceRow, EmptyLine, SubViewRoot } from "../Sync.style";

export interface DevicesProps {
  readonly status: SyncStatusSnapshot | null;
}

const Devices: FC<DevicesProps> = ({ status }) => {
  const { t } = useTranslation();
  const [isPairingOpen, setIsPairingOpen] = useState(false);

  const devices = status?.devices ?? [];

  return (
    <SubViewRoot data-testid="sync-view-devices">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{t("sync.status.devices")}</strong>
        <Button
          variant="primary"
          data-testid="sync-pair-device-button"
          onClick={() => setIsPairingOpen(true)}
        >
          {t("sync.pairing.load")}
        </Button>
      </div>

      {devices.length === 0 ? (
        <EmptyLine>{t("common.empty")}</EmptyLine>
      ) : (
        devices.map((d) => (
          <DeviceRow key={d.id} data-testid={`sync-device-${d.id}`}>
            <span>{d.name || d.id.slice(0, 8)}</span>
            <Badge tone={d.connected ? "success" : "neutral"}>
              {d.connected ? t("sync.device.online") : t("sync.device.offline")}
            </Badge>
          </DeviceRow>
        ))
      )}

      <Modal
        isOpen={isPairingOpen}
        title={t("sync.pairing.title")}
        onClose={() => setIsPairingOpen(false)}
        width={680}
      >
        <div data-testid="sync-pairing-modal-body">
          <SyncPairing />
        </div>
      </Modal>
    </SubViewRoot>
  );
};

export default Devices;
