import {FC, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {toast} from "react-toastify";

import {apiFactory} from "../../../api";
import type {AppSettings} from "../../../domain/Settings";
import {SubViewRoot, ToggleRow} from "../Sync.style";

const settingsApi = apiFactory.createSettingsApi();

const SettingsView: FC = () => {
    const {t} = useTranslation();
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void settingsApi.getSettings().then(setSettings).catch(() => setSettings(null));
    }, []);

    const toggleEnabled = async (enabled: boolean) => {
        if (!settings) return;
        setSaving(true);
        const next = {...settings, syncthingEnabled: enabled};
        try {
            const saved = await settingsApi.saveSettings(next);
            setSettings(saved);
            toast.success(t("settings.savedToast"));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <SubViewRoot data-testid="sync-view-settings">
            <strong>{t("settings.tabs.sync")}</strong>
            <ToggleRow>
                <input
                    type="checkbox"
                    data-testid="sync-settings-enabled"
                    checked={Boolean(settings?.syncthingEnabled)}
                    disabled={!settings || saving}
                    onChange={(event) => void toggleEnabled(event.target.checked)}
                />
                {t("sync.settings.enableSyncthing")}
            </ToggleRow>
        </SubViewRoot>
    );
};

export default SettingsView;
