import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { toast } from "react-toastify";
import { FolderOpen, Play } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { api } from "../../api/MozgoslavApi";
import { AppSettings, DEFAULT_SETTINGS } from "../../models/Settings";
import { setThemeMode } from "../../styles/ThemeProvider";
import SyncPairing from "../SyncPairing";
import { PageRoot, PageTitle, Tabs, Tab, FormGrid, Toolbar, Row, SelectBox, SelectOption } from "./Settings.style";

type TabKey = "general" | "storage" | "llm" | "whisper" | "obsidian" | "sync";

const Settings: FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("general");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const loaded = await api.getSettings();
      setSettings(loaded);
    } catch {
      // keep defaults if backend unreachable
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.saveSettings(settings);
      setSettings(saved);
      if (saved.language !== i18n.language) {
        void i18n.changeLanguage(saved.language);
      }
      setThemeMode(saved.themeMode);
      toast.success(t("settings.savedToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const checkLlm = async () => {
    try {
      const ok = await api.llmHealth();
      toast[ok ? "success" : "warning"](ok ? "LLM: ✓" : "LLM: ✗");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const pickVaultFolder = async () => {
    if (!window.mozgoslav) return;
    const res = await window.mozgoslav.openFolder();
    if (!res.canceled && res.filePaths[0]) {
      update("vaultPath", res.filePaths[0]);
    }
  };

  const pickWhisperFile = async () => {
    if (!window.mozgoslav) return;
    const res = await window.mozgoslav.openAudioFiles();
    if (!res.canceled && res.filePaths[0]) {
      update("whisperModelPath", res.filePaths[0]);
    }
  };

  const tabs = useMemo(
    () => ([
      { key: "general" as TabKey, label: t("settings.tabs.general") },
      { key: "storage" as TabKey, label: t("settings.tabs.storage") },
      { key: "llm" as TabKey, label: t("settings.tabs.llm") },
      { key: "whisper" as TabKey, label: t("settings.tabs.whisper") },
      { key: "obsidian" as TabKey, label: t("settings.tabs.obsidian") },
      { key: "sync" as TabKey, label: t("settings.tabs.sync") },
    ]),
    [t],
  );

  return (
    <PageRoot>
      <PageTitle>{t("settings.title")}</PageTitle>
      <Tabs>
        {tabs.map((tabItem) => (
          <Tab key={tabItem.key} $active={tab === tabItem.key} onClick={() => setTab(tabItem.key)}>
            {tabItem.label}
          </Tab>
        ))}
      </Tabs>

      {tab === "general" && (
        <Card>
          <FormGrid>
            <div>
              <label>{t("settings.fields.language")}</label>
              <SelectBox value={settings.language} onChange={(e) => update("language", e.target.value)}>
                <SelectOption value="ru">Русский</SelectOption>
                <SelectOption value="en">English</SelectOption>
              </SelectBox>
            </div>
            <div>
              <label>{t("settings.fields.theme")}</label>
              <SelectBox
                value={settings.themeMode}
                onChange={(e) => update("themeMode", e.target.value as AppSettings["themeMode"])}
              >
                <SelectOption value="system">{t("settings.theme.system")}</SelectOption>
                <SelectOption value="light">{t("settings.theme.light")}</SelectOption>
                <SelectOption value="dark">{t("settings.theme.dark")}</SelectOption>
              </SelectBox>
            </div>
          </FormGrid>
        </Card>
      )}

      {tab === "storage" && (
        <Card>
          <FormGrid>
            <Row>
              <Input
                label={t("settings.fields.vaultPath")}
                value={settings.vaultPath}
                onChange={(e) => update("vaultPath", e.target.value)}
                placeholder="/Users/you/Obsidian Vault"
              />
              <Button variant="secondary" leftIcon={<FolderOpen size={16} />} onClick={pickVaultFolder}>
                {t("common.add")}
              </Button>
            </Row>
          </FormGrid>
        </Card>
      )}

      {tab === "llm" && (
        <Card>
          <FormGrid>
            <Input
              label={t("settings.fields.llmEndpoint")}
              value={settings.llmEndpoint}
              onChange={(e) => update("llmEndpoint", e.target.value)}
            />
            <Input
              label={t("settings.fields.llmModel")}
              value={settings.llmModel}
              onChange={(e) => update("llmModel", e.target.value)}
            />
            <Input
              label={t("settings.fields.llmApiKey")}
              value={settings.llmApiKey}
              onChange={(e) => update("llmApiKey", e.target.value)}
              sensitive
              hint={t("settings.tokenHint")}
            />
            <Button variant="secondary" leftIcon={<Play size={16} />} onClick={checkLlm}>
              {t("settings.testConnection")}
            </Button>
          </FormGrid>
        </Card>
      )}

      {tab === "whisper" && (
        <Card>
          <FormGrid>
            <Row>
              <Input
                label={t("settings.fields.whisperModelPath")}
                value={settings.whisperModelPath}
                onChange={(e) => update("whisperModelPath", e.target.value)}
              />
              <Button variant="secondary" leftIcon={<FolderOpen size={16} />} onClick={pickWhisperFile}>
                {t("common.add")}
              </Button>
            </Row>
            <Input
              label={t("settings.fields.vadModelPath")}
              value={settings.vadModelPath}
              onChange={(e) => update("vadModelPath", e.target.value)}
            />
            <Input
              type="number"
              label={t("settings.fields.whisperThreads")}
              value={settings.whisperThreads}
              onChange={(e) => update("whisperThreads", Number(e.target.value) || 0)}
            />
          </FormGrid>
        </Card>
      )}

      {tab === "sync" && <SyncPairing />}

      {tab === "obsidian" && (
        <Card>
          <FormGrid>
            <Input
              label={t("settings.fields.obsidianApiHost")}
              value={settings.obsidianApiHost}
              onChange={(e) => update("obsidianApiHost", e.target.value)}
            />
            <Input
              label={t("settings.fields.obsidianApiToken")}
              value={settings.obsidianApiToken}
              onChange={(e) => update("obsidianApiToken", e.target.value)}
              sensitive
              hint={t("settings.tokenHint")}
            />
          </FormGrid>
        </Card>
      )}

      {tab !== "sync" && (
        <Toolbar>
          <Button variant="primary" isLoading={saving} onClick={save}>
            {t("common.save")}
          </Button>
        </Toolbar>
      )}
    </PageRoot>
  );
};

export default Settings;
