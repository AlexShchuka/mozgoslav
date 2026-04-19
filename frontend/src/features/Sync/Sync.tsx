import {FC, useEffect, useMemo, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {useTranslation} from "react-i18next";

import {loadSyncStatus, selectSyncStatus, startSyncEventStream, stopSyncEventStream,} from "../../store/slices/sync";
import Devices from "./views/Devices";
import Folders from "./views/Folders";
import Conflicts from "./views/Conflicts";
import SettingsView from "./views/Settings";
import type {SyncView} from "./types";
import {PageRoot, PageTitle, TabBar, TabButton} from "./Sync.style";

const TABS: readonly { key: SyncView; labelKey: string }[] = [
    {key: "devices", labelKey: "sync.tabs.devices"},
    {key: "folders", labelKey: "sync.tabs.folders"},
    {key: "conflicts", labelKey: "sync.tabs.conflicts"},
    {key: "settings", labelKey: "sync.tabs.settings"},
];

const Sync: FC = () => {
    const {t} = useTranslation();
    const [view, setView] = useState<SyncView>("devices");
    const dispatch = useDispatch() as (action: any) => void;
    const status = useSelector(selectSyncStatus);

    useEffect(() => {
        dispatch(loadSyncStatus());
        dispatch(startSyncEventStream());
        return () => {
            dispatch(stopSyncEventStream());
        };
    }, [dispatch]);

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

            {view === "devices" && <Devices status={status}/>}
            {view === "folders" && <Folders status={status}/>}
            {view === "conflicts" && <Conflicts folderPaths={folderPaths}/>}
            {view === "settings" && <SettingsView/>}
        </PageRoot>
    );
};

export default Sync;
