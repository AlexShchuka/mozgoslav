import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { CheckCircle2, Circle, FolderTree } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import { api } from "../../api/MozgoslavApi";
import { AppSettings, DEFAULT_SETTINGS } from "../../types/Settings";
import { FolderGrid, FolderItem, FolderHint, PageRoot, PageTitle, Subtitle, VaultRow } from "./Obsidian.style";

const PRESET_FOLDERS = [
  { key: "_inbox", required: true },
  { key: "People", required: false },
  { key: "Projects", required: false },
  { key: "Topics", required: false },
  { key: "Archive", required: false },
  { key: "Templates", required: false },
] as const;

const Obsidian: FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(PRESET_FOLDERS.filter((f) => f.required).map((f) => f.key)),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const toggle = (key: string, required: boolean) => {
    if (required) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const pickVault = async () => {
    if (!window.mozgoslav) return;
    const res = await window.mozgoslav.openFolder();
    if (!res.canceled && res.filePaths[0]) {
      const updated = { ...settings, vaultPath: res.filePaths[0] };
      setSettings(updated);
      await api.saveSettings(updated);
    }
  };

  const applySetup = async () => {
    if (!settings.vaultPath) {
      toast.warning(t("settings.fields.vaultPath"));
      return;
    }
    setBusy(true);
    try {
      const report = (await api.setupObsidian(settings.vaultPath)) as { createdPaths: string[] };
      toast.success(t("obsidian.setupSuccess", { created: report.createdPaths.length }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const selectedArray = useMemo(() => Array.from(selected), [selected]);

  return (
    <PageRoot>
      <div>
        <PageTitle>{t("obsidian.title")}</PageTitle>
        <Subtitle>{t("obsidian.setupHint")}</Subtitle>
      </div>

      <Card title={t("settings.fields.vaultPath")}>
        <VaultRow>
          <code>{settings.vaultPath || "—"}</code>
          <Button variant="secondary" onClick={pickVault}>
            {t("common.add")}
          </Button>
        </VaultRow>
      </Card>

      <Card title={t("obsidian.setupTitle")} subtitle={t("obsidian.setupHint")}>
        <FolderGrid>
          {PRESET_FOLDERS.map(({ key, required }) => {
            const active = selected.has(key);
            return (
              <FolderItem
                key={key}
                type="button"
                $active={active}
                $required={required}
                onClick={() => toggle(key, required)}
              >
                {active ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                <div>
                  <strong>{t(`obsidian.folders.${key}` as const)}</strong>
                  {required && <FolderHint>{t("common.yes")} · обязательно</FolderHint>}
                </div>
              </FolderItem>
            );
          })}
        </FolderGrid>
        <FolderHint>{t("obsidian.templateHint")}</FolderHint>
        <div style={{ marginTop: 16 }}>
          <Button
            variant="primary"
            leftIcon={<FolderTree size={16} />}
            isLoading={busy}
            onClick={applySetup}
            disabled={!settings.vaultPath || selectedArray.length === 0}
          >
            {t("obsidian.applyButton")}
          </Button>
        </div>
      </Card>
    </PageRoot>
  );
};

export default Obsidian;
