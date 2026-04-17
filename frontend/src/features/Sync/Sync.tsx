import { FC, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import {
  loadSyncStatus,
  selectSyncStatus,
  startSyncEventStream,
  stopSyncEventStream,
} from "../../store/slices/sync";
import Devices from "./views/Devices";
import Folders from "./views/Folders";
import Conflicts from "./views/Conflicts";
import SettingsView from "./views/Settings";
import type { SyncView } from "./types";
import { PageRoot, PageTitle, TabBar, TabButton } from "./Sync.style";

const TABS: readonly { key: SyncView; labelKey: string }[] = [
  { key: "devices", labelKey: "sync.tabs.devices" },
  { key: "folders", labelKey: "sync.tabs.folders" },
  { key: "conflicts", labelKey: "sync.tabs.conflicts" },
  { key: "settings", labelKey: "sync.tabs.settings" },
];

// BC-050 — first-class Sync tab. Four sub-views share one connected slice
// (the existing `sync` redux store). Devices view reuses SyncPairing in a
// modal. Conflicts pulls `.sync-conflict-*` paths from electron IPC.
const Sync: FC = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<SyncView>("devices");
  // react-redux v9 expects `UnknownAction` with an index-signature; our slice
  // actions are discriminated unions (safer at the boundary) so we widen at
  // dispatch time — type safety of the action is enforced by the creator
  // functions themselves.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dispatch = useDispatch() as (action: any) => void;
  const status = useSelector(selectSyncStatus);

  useEffect(() => {
    dispatch(loadSyncStatus());
    dispatch(startSyncEventStream());
    return () => {
      dispatch(stopSyncEventStream());
    };
  }, [dispatch]);

  // Derive unique folder paths for the Conflicts sub-view. The SyncStatus
  // `folders[].id` is a Syncthing folder id; the electron IPC expects the
  // filesystem path, which we keep as the same string for simplicity (Phase 2
  // backend sends the same value).
  const folderPaths = useMemo(() => (status?.folders ?? []).map((f) => f.id), [status]);

  return (
    <PageRoot>
      <PageTitle data-testid="sync-page-title">{t("nav.sync")}</PageTitle>
      <TabBar data-testid="sync-tab-bar">
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            $active={view === tab.key}
            data-testid={`sync-tab-${tab.key}`}
            onClick={() => setView(tab.key)}
          >
            {t(tab.labelKey as `sync.tabs.${SyncView}`)}
          </TabButton>
        ))}
      </TabBar>

      {view === "devices" && <Devices status={status} />}
      {view === "folders" && <Folders status={status} />}
      {view === "conflicts" && <Conflicts folderPaths={folderPaths} />}
      {view === "settings" && <SettingsView />}
    </PageRoot>
  );
};

export default Sync;
