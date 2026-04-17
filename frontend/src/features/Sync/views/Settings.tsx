import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { api } from "../../../api/MozgoslavApi";
import type { AppSettings } from "../../../domain/Settings";
import { SubViewRoot, ToggleRow } from "../Sync.style";

// BC-050 — Settings sub-view toggles the Syncthing bridge at the settings
// level. The backend's `syncthingEnabled` field drives whether the native
// Syncthing binary launches next boot.
const SettingsView: FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api.getSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  const toggleEnabled = async (enabled: boolean) => {
    if (!settings) return;
    setSaving(true);
    const next = { ...settings, syncthingEnabled: enabled };
    try {
      const saved = await api.saveSettings(next);
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
