import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { toast } from "react-toastify";
import { FolderOpen, Play } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import HotkeyRecorder from "../../components/HotkeyRecorder";
import Input from "../../components/Input";
import { AppSettings, DEFAULT_SETTINGS } from "../../domain/Settings";
import { setThemeMode } from "../../styles/ThemeProvider";
import SyncPairing from "../SyncPairing";
import SystemActionsFeature from "../SystemActions";
import type { SettingsProps } from "./types";
import {
  CapabilityBadges,
  CheckboxRow,
  FieldHint,
  FormGrid,
  InlineEmpty,
  ModelOption,
  PageRoot,
  PageTitle,
  Row,
  Section,
  SectionHeader,
  SelectBox,
  SelectOption,
  Tab,
  Tabs,
  Toolbar,
} from "./Settings.style";

type TabKey = "general" | "llm" | "whisper" | "dictation" | "obsidian" | "sync" | "systemActions";

const URL_RE = /^https?:\/\//i;
const HTTP_PROTOCOL = "http://";

const isValidUrl = (value: string): boolean => URL_RE.test(value.trim());

const Settings: FC<SettingsProps> = ({
  settings: loadedSettings,
  isSaving,
  isLlmProbing,
  llmCapabilities,
  llmModels,
  llmModelsLoading,
  onLoad,
  onSave,
  onCheckLlm,
  onLoadCapabilities,
  onLoadModels,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("general");
  const [draft, setDraft] = useState<AppSettings>(loadedSettings ?? DEFAULT_SETTINGS);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [dictationDumpOpen, setDictationDumpOpen] = useState<boolean>(false);

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  useEffect(() => {
    if (tab === "llm") {
      onLoadCapabilities();
      onLoadModels();
    }
  }, [tab, onLoadCapabilities, onLoadModels]);

  useEffect(() => {
    if (loadedSettings) {
      setDraft(loadedSettings);
      if (loadedSettings.language !== i18n.language) {
        void i18n.changeLanguage(loadedSettings.language);
      }
      setThemeMode(loadedSettings.themeMode);
    }
  }, [loadedSettings]);

  useEffect(() => {
    if (tab !== "llm") {
      return undefined;
    }
    const trimmed = draft.llmEndpoint.trim();
    if (!isValidUrl(trimmed)) {
      return undefined;
    }
    const handle = window.setTimeout(() => {
      onLoadModels();
    }, 500);
    return () => window.clearTimeout(handle);
  }, [tab, draft.llmEndpoint, onLoadModels]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    onSave(draft);
    toast.success(t("settings.savedToast"));
  };

  const checkLlm = () => {
    onCheckLlm();
  };

  const pickWhisperFile = async () => {
    if (!window.mozgoslav) return;
    const res = await window.mozgoslav.openAudioFiles();
    if (!res.canceled && res.filePaths[0]) {
      update("whisperModelPath", res.filePaths[0]);
    }
  };

  const llmEndpointError = useMemo(() => {
    const trimmed = draft.llmEndpoint.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    return isValidUrl(trimmed) ? undefined : t("settings.validation.invalidUrl");
  }, [draft.llmEndpoint, t]);

  const obsidianHostError = useMemo(() => {
    const trimmed = draft.obsidianApiHost.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    return isValidUrl(trimmed) ? undefined : t("settings.validation.invalidUrl");
  }, [draft.obsidianApiHost, t]);

  const tabs = useMemo(
    () => [
      { key: "general" as TabKey, label: t("settings.tabs.general") },
      { key: "llm" as TabKey, label: t("settings.tabs.llm") },
      { key: "whisper" as TabKey, label: t("settings.tabs.whisper") },
      { key: "dictation" as TabKey, label: t("settings.tabs.dictation") },
      { key: "obsidian" as TabKey, label: t("settings.tabs.obsidian") },
      { key: "sync" as TabKey, label: t("settings.tabs.sync") },
      { key: "systemActions" as TabKey, label: t("systemActions.title") },
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
        <Card title={t("settings.sections.uiAndLanguage")}>
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

      {tab === "llm" && (
        <Section>
          <Card title={t("settings.sections.llmCore")}>
            <FormGrid>
              <Input
                label={t("settings.fields.llmEndpoint")}
                value={draft.llmEndpoint}
                onChange={(e) => update("llmEndpoint", e.target.value)}
                placeholder={HTTP_PROTOCOL}
                error={llmEndpointError}
              />
              <div>
                <label>{t("settings.llmModels.label")}</label>
                <SelectBox
                  value={draft.llmModel}
                  onChange={(e) => update("llmModel", e.target.value)}
                  disabled={llmModelsLoading || llmModels.length === 0}
                  data-testid="settings-llm-model-select"
                >
                  <SelectOption value="">
                    {llmModelsLoading
                      ? t("settings.llmModels.loading")
                      : t("settings.llmModels.placeholder")}
                  </SelectOption>
                  {llmModels.map((model) => (
                    <SelectOption key={model.id} value={model.id}>
                      {model.id}
                    </SelectOption>
                  ))}
                </SelectBox>
                {llmModels.length === 0 && !llmModelsLoading ? (
                  <InlineEmpty data-testid="settings-llm-models-empty">
                    {t("settings.llmModels.empty")}
                  </InlineEmpty>
                ) : null}
                {llmModels.length > 0 && (
                  <ModelOption>
                    <CapabilityBadges>
                      {llmModels
                        .filter((m) => m.id === draft.llmModel)
                        .map((m) => (
                          <Badges key={m.id} model={m} />
                        ))}
                    </CapabilityBadges>
                  </ModelOption>
                )}
              </div>
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
              <div>
                <label>{t("settings.llmCapabilities.title")}</label>
                {llmCapabilities === null ? (
                  <Badge tone="neutral">{t("settings.llmCapabilities.notProbed")}</Badge>
                ) : (
                  <Row>
                    <Badge tone={llmCapabilities.supportsToolCalling ? "success" : "warning"}>
                      {t("settings.llmCapabilities.toolCalling")}
                    </Badge>
                    <Badge tone={llmCapabilities.supportsJsonMode ? "success" : "warning"}>
                      {t("settings.llmCapabilities.jsonMode")}
                    </Badge>
                    {llmCapabilities.ctxLength > 0 && (
                      <Badge tone="info">
                        {t("settings.llmCapabilities.ctxLength", { n: llmCapabilities.ctxLength })}
                      </Badge>
                    )}
                    {llmCapabilities.tokensPerSecond > 0 && (
                      <Badge tone="neutral">
                        {t("settings.llmCapabilities.tokensPerSec", {
                          n: Math.round(llmCapabilities.tokensPerSecond),
                        })}
                      </Badge>
                    )}
                  </Row>
                )}
              </div>
            </FormGrid>
          </Card>
        </Section>
      )}

      {tab === "whisper" && (
        <Card title={t("settings.sections.transcription")}>
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
        <Section>
          <Card title={t("settings.sections.dictationCore")}>
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
              <CheckboxRow>
                <input
                  type="checkbox"
                  data-testid="settings-dictation-push-to-talk"
                  checked={draft.dictationPushToTalk}
                  onChange={(e) => update("dictationPushToTalk", e.target.checked)}
                />
                <span>{t("settings.fields.dictationPushToTalk")}</span>
              </CheckboxRow>
            </FormGrid>
          </Card>

          <SectionHeader
            type="button"
            $expanded={dictationDumpOpen}
            onClick={() => setDictationDumpOpen((v) => !v)}
            data-testid="settings-section-dictation-dump"
            aria-expanded={dictationDumpOpen}
          >
            {t("settings.sections.dictationDump")}
          </SectionHeader>
          {dictationDumpOpen && (
            <Card>
              <FormGrid>
                <CheckboxRow>
                  <input
                    type="checkbox"
                    data-testid="settings-dictation-dump-enabled"
                    checked={draft.dictationDumpEnabled}
                    onChange={(e) => update("dictationDumpEnabled", e.target.checked)}
                  />
                  <span>{t("settings.fields.dictationDumpEnabled")}</span>
                </CheckboxRow>
                <div>
                  <label>{t("settings.fields.dictationDumpHotkeyToggle")}</label>
                  <HotkeyRecorder
                    value={draft.dictationDumpHotkeyToggle}
                    onChange={(accelerator) => update("dictationDumpHotkeyToggle", accelerator)}
                    hint={t("settings.dumpHotkeyToggleHint")}
                    testId="dictation-dump-toggle"
                  />
                </div>
                <div>
                  <label>{t("settings.fields.dictationDumpHotkeyHold")}</label>
                  <HotkeyRecorder
                    value={draft.dictationDumpHotkeyHold}
                    onChange={(accelerator) => update("dictationDumpHotkeyHold", accelerator)}
                    hint={t("settings.dumpHotkeyHoldHint")}
                    testId="dictation-dump-hold"
                  />
                </div>
              </FormGrid>
            </Card>
          )}
        </Section>
      )}

      {tab === "sync" && <SyncPairing />}

      {tab === "obsidian" && (
        <Card title={t("settings.sections.obsidian")}>
          <FormGrid>
            <Input
              label={t("settings.fields.obsidianApiHost")}
              value={draft.obsidianApiHost}
              onChange={(e) => update("obsidianApiHost", e.target.value)}
              placeholder={HTTP_PROTOCOL}
              error={obsidianHostError}
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

      {tab === "systemActions" && <SystemActionsFeature />}

      {tab !== "sync" && tab !== "systemActions" && (
        <Toolbar>
          <Button variant="primary" isLoading={isSaving} onClick={save}>
            {t("common.save")}
          </Button>
        </Toolbar>
      )}

      {tab === "general" && (
        <Section>
          <SectionHeader
            type="button"
            $expanded={advancedOpen}
            onClick={() => setAdvancedOpen((v) => !v)}
            data-testid="settings-section-advanced"
            aria-expanded={advancedOpen}
          >
            {t("settings.sections.advanced")}
          </SectionHeader>
          {advancedOpen && (
            <Card>
              <FormGrid>
                <CheckboxRow>
                  <input
                    type="checkbox"
                    data-testid="settings-sidecar-enrichment-enabled"
                    checked={draft.sidecarEnrichmentEnabled}
                    onChange={(e) => update("sidecarEnrichmentEnabled", e.target.checked)}
                  />
                  <span>{t("settings.sidecarEnrichment.label")}</span>
                </CheckboxRow>
                <FieldHint>{t("settings.sidecarEnrichment.description")}</FieldHint>
              </FormGrid>
            </Card>
          )}
        </Section>
      )}
    </PageRoot>
  );
};

interface BadgesProps {
  readonly model: {
    readonly contextLength?: number | null;
    readonly supportsToolCalling?: boolean | null;
    readonly supportsJsonMode?: boolean | null;
    readonly ownedBy?: string | null;
  };
}

const Badges: FC<BadgesProps> = ({ model }) => {
  const { t } = useTranslation();
  return (
    <>
      {model.ownedBy && (
        <Badge tone="neutral">{t("settings.llmModels.ownedBy", { owner: model.ownedBy })}</Badge>
      )}
      {model.contextLength != null && (
        <Badge tone="info">{t("settings.llmModels.ctxLength", { n: model.contextLength })}</Badge>
      )}
      {model.supportsToolCalling === true && (
        <Badge tone="success">{t("settings.llmModels.supportsToolCalling")}</Badge>
      )}
      {model.supportsJsonMode === true && (
        <Badge tone="success">{t("settings.llmModels.supportsJsonMode")}</Badge>
      )}
    </>
  );
};

export default Settings;
