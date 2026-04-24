import { FC } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

import ProgressBar from "../../../components/ProgressBar";
import type { SyncStatusSnapshot } from "../../../store/slices/sync/types";
import { ConflictBadge, EmptyLine, FolderRow, SubViewRoot } from "../Sync.style";

export interface FoldersProps {
  readonly status: SyncStatusSnapshot | null;
}

const Folders: FC<FoldersProps> = ({ status }) => {
  const { t } = useTranslation();
  const folders = status?.folders ?? [];

  return (
    <SubViewRoot data-testid="sync-view-folders">
      <strong>{t("sync.status.folders")}</strong>
      {folders.length === 0 ? (
        <EmptyLine>{t("common.empty")}</EmptyLine>
      ) : (
        folders.map((f) => (
          <FolderRow key={f.id} data-testid={`sync-folder-${f.id}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{f.id}</span>
                {f.conflicts > 0 && (
                  <ConflictBadge data-testid={`sync-folder-conflict-${f.id}`}>
                    <AlertTriangle size={12} /> {f.conflicts}
                  </ConflictBadge>
                )}
              </div>
              <ProgressBar
                value={f.completionPct}
                status={f.completionPct >= 99 ? "success" : "active"}
              />
            </div>
          </FolderRow>
        ))
      )}
    </SubViewRoot>
  );
};

export default Folders;
