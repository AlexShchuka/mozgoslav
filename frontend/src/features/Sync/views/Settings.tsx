import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";

import {
  loadSettings,
  saveSettings,
  selectSettings,
  selectSettingsSaving,
} from "../../../store/slices/settings";
import { SubViewRoot, ToggleRow } from "../Sync.style";

const SettingsView: FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<Action>>();

  const settings = useSelector(selectSettings);
  const saving = useSelector(selectSettingsSaving);

  useEffect(() => {
    dispatch(loadSettings());
  }, [dispatch]);

  const toggleEnabled = (enabled: boolean) => {
    if (!settings) return;
    dispatch(saveSettings({ ...settings, syncthingEnabled: enabled }));
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
          onChange={(event) => toggleEnabled(event.target.checked)}
        />
        {t("sync.settings.enableSyncthing")}
      </ToggleRow>
    </SubViewRoot>
  );
};

export default SettingsView;
