import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { toast } from "react-toastify";
import { FolderOpen, Play } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import HotkeyRecorder from "../../components/HotkeyRecorder";
import Input from "../../components/Input";
import { AppSettings, DEFAULT_SETTINGS } from "../../domain/Settings";
import { setThemeMode } from "../../styles/ThemeProvider";
import SyncPairing from "../SyncPairing";
import type { SettingsProps } from "./types";
import {
  FormGrid,
  PageRoot,
  PageTitle,
  Row,
  SelectBox,
  SelectOption,
  Tab,
  Tabs,
  Toolbar,
} from "./Settings.style";

type TabKey = "general" | "storage" | "llm" | "whisper" | "dictation" | "obsidian" | "sync";

const Settings: FC<SettingsProps> = ({
  settings: loadedSettings,
  isSaving,
  isLlmProbing,
  onLoad,
  onSave,
  onCheckLlm,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("general");
  const [draft, setDraft] = useState<AppSettings>(loadedSettings ?? DEFAULT_SETTINGS);

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  useEffect(() => {
    if (loadedSettings) {
      setDraft(loadedSettings);
      if (loadedSettings.language !== i18n.language) {
        void i18n.changeLanguage(loadedSettings.language);
      }
      setThemeMode(loadedSettings.themeMode);
    }
  }, [loadedSettings]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    onSave(draft);
    toast.success(t("settings.savedToast"));
  };

  const checkLlm = () => {
    onCheckLlm();
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
    () => [
      { key: "general" as TabKey, label: t("settings.tabs.general") },
      { key: "storage" as TabKey, label: t("settings.tabs.storage") },
      { key: "llm" as TabKey, label: t("settings.tabs.llm") },
      { key: "whisper" as TabKey, label: t("settings.tabs.whisper") },
      { key: "dictation" as TabKey, label: t("settings.tabs.dictation") },
      { key: "obsidian" as TabKey, label: t("settings.tabs.obsidian") },
      { key: "sync" as TabKey, label: t("settings.tabs.sync") },
    ],
    [t]
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
              <SelectBox
                value={draft.language}
                onChange={(e) => update("language", e.target.value)}
              >
                <SelectOption value="ru">Русский</SelectOption>
                <SelectOption value="en">English</SelectOption>
              </SelectBox>
            </div>
            <div>
              <label>{t("settings.fields.theme")}</label>
              <SelectBox
                value={draft.themeMode}
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
                value={draft.vaultPath}
                onChange={(e) => update("vaultPath", e.target.value)}
                placeholder="/Users/you/Obsidian Vault"
              />
              <Button
                variant="secondary"
                leftIcon={<FolderOpen size={16} />}
                onClick={pickVaultFolder}
              >
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
              value={draft.llmEndpoint}
              onChange={(e) => update("llmEndpoint", e.target.value)}
            />
            <Input
              label={t("settings.fields.llmModel")}
              value={draft.llmModel}
              onChange={(e) => update("llmModel", e.target.value)}
            />
            <Input
              label={t("settings.fields.llmApiKey")}
              value={draft.llmApiKey}
              onChange={(e) => update("llmApiKey", e.target.value)}
              sensitive
              hint={t("settings.tokenHint")}
            />
            <Button
              variant="secondary"
              leftIcon={<Play size={16} />}
              onClick={checkLlm}
              isLoading={isLlmProbing}
              disabled={isLlmProbing}
            >
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
                value={draft.whisperModelPath}
                onChange={(e) => update("whisperModelPath", e.target.value)}
              />
              <Button
                variant="secondary"
                leftIcon={<FolderOpen size={16} />}
                onClick={pickWhisperFile}
              >
                {t("common.add")}
              </Button>
            </Row>
            <Input
              label={t("settings.fields.vadModelPath")}
              value={draft.vadModelPath}
              onChange={(e) => update("vadModelPath", e.target.value)}
            />
            <Input
              type="number"
              label={t("settings.fields.whisperThreads")}
              value={draft.whisperThreads}
              onChange={(e) => update("whisperThreads", Number(e.target.value) || 0)}
            />
          </FormGrid>
        </Card>
      )}

      {tab === "dictation" && (
        <Card>
          <FormGrid>
            <div>
              <label>{t("settings.fields.dictationKeyboardHotkey")}</label>
              <HotkeyRecorder
                value={draft.dictationKeyboardHotkey}
                onChange={(accelerator) => update("dictationKeyboardHotkey", accelerator)}
                hint={t("settings.hotkeyHint")}
                testId="dictation"
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                data-testid="settings-dictation-push-to-talk"
                checked={draft.dictationPushToTalk}
                onChange={(e) => update("dictationPushToTalk", e.target.checked)}
              />
              <span>{t("settings.fields.dictationPushToTalk")}</span>
            </label>
          </FormGrid>
        </Card>
      )}

      {tab === "sync" && <SyncPairing />}

      {tab === "obsidian" && (
        <Card>
          <FormGrid>
            <Input
              label={t("settings.fields.obsidianApiHost")}
              value={draft.obsidianApiHost}
              onChange={(e) => update("obsidianApiHost", e.target.value)}
            />
            <Input
              label={t("settings.fields.obsidianApiToken")}
              value={draft.obsidianApiToken}
              onChange={(e) => update("obsidianApiToken", e.target.value)}
              sensitive
              hint={t("settings.tokenHint")}
            />
          </FormGrid>
        </Card>
      )}

      {tab !== "sync" && (
        <Toolbar>
          <Button variant="primary" isLoading={isSaving} onClick={save}>
            {t("common.save")}
          </Button>
        </Toolbar>
      )}
    </PageRoot>
  );
};

export default Settings;
