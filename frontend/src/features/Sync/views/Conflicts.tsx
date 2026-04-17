import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../../../components/Button";
import type { SyncConflictFile } from "../types";
import { DeviceRow, EmptyLine, SubViewRoot } from "../Sync.style";

export interface ConflictsProps {
  readonly folderPaths: readonly string[];
}

// BC-050 — lists every `.sync-conflict-*` file across every synced folder.
// The actual resolution happens manually via Finder — see
// `docs/sync-conflicts.md`.
const Conflicts: FC<ConflictsProps> = ({ folderPaths }) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<SyncConflictFile[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loader = async () => {
      const bridge = (window as unknown as {
        mozgoslav?: {
          listSyncConflicts?: (folderPath: string) => Promise<SyncConflictFile[]>;
        };
      }).mozgoslav;
      if (!bridge?.listSyncConflicts) return;
      const collected: SyncConflictFile[] = [];
      for (const folderPath of folderPaths) {
        try {
          const items = await bridge.listSyncConflicts(folderPath);
          collected.push(...items);
        } catch {
          // ignore — the IPC may be missing in tests or non-macOS.
        }
      }
      if (!cancelled) setFiles(collected);
    };
    void loader();
    return () => {
      cancelled = true;
    };
  }, [folderPaths]);

  const open = (path: string) => {
    const bridge = (window as unknown as {
      mozgoslav?: { openPath?: (path: string) => Promise<string | undefined> };
    }).mozgoslav;
    void bridge?.openPath?.(path);
  };

  return (
    <SubViewRoot data-testid="sync-view-conflicts">
      <strong>{t("sync.conflicts.title")}</strong>
      {files.length === 0 ? (
        <EmptyLine data-testid="sync-conflicts-empty">
          {t("sync.conflicts.empty")}
        </EmptyLine>
      ) : (
        files.map((file) => (
          <DeviceRow key={file.conflictPath} data-testid="sync-conflict-row">
            <span>{file.conflictPath}</span>
            <Button variant="ghost" onClick={() => open(file.conflictPath)}>
              {t("sync.conflicts.reveal")}
            </Button>
          </DeviceRow>
        ))
      )}
    </SubViewRoot>
  );
};

export default Conflicts;
