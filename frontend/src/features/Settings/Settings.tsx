import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { FolderOpen, Play } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import HotkeyRecorder from "../../components/HotkeyRecorder";
import Input from "../../components/Input";
import type { LlmCapabilities, LlmModelDescriptor } from "../../api/gql/graphql";
import { AppSettings, DEFAULT_SETTINGS } from "../../domain/Settings";
import { setThemeMode } from "../../styles/ThemeProvider";
import SyncPairing from "../SyncPairing";
import SystemActionsFeature from "../SystemActions";
import ProfilesContainer from "../Profiles/Profiles.container";
import type { SettingsProps } from "./types";
import {
  Breadcrumb,
  CapabilityBadges,
  CategorySection,
  CategoryTitle,
  CheckboxRow,
  ContentScroll,
  FieldHint,
  FieldRing,
  FormGrid,
  HighlightMark,
  InlineEmpty,
  ModelOption,
  Row,
  SearchEmptyState,
  SearchInput,
  Section,
  SectionHeader,
  SelectBox,
  SelectOption,
  SettingsContent,
  SettingsRoot,
  SettingsSidebar,
  SidebarCategory,
  StickyHeader,
  SubSection,
  SubSectionTitle,
  SystemLinkCard,
  SystemLinksGrid,
} from "./Settings.style";

type CategoryKey = "general" | "voice" | "llm" | "knowledge" | "system";

interface SettingField {
  key: string;
  label: string;
  description?: string;
  category: CategoryKey;
  value: string | number | boolean;
  defaultValue: string | number | boolean;
}

const URL_RE = /^https?:\/\//i;
const HTTP_PROTOCOL = "http://";
const SEARCH_DEBOUNCE_MS = 150;
const AUTOSAVE_DEBOUNCE_MS = 500;

const isValidUrl = (value: string): boolean => URL_RE.test(value.trim());

const highlightMatch = (text: string, query: string): JSX.Element => {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <HighlightMark>{text.slice(idx, idx + query.length)}</HighlightMark>
      {text.slice(idx + query.length)}
    </>
  );
};

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
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("general");
  const [draft, setDraft] = useState<AppSettings>(loadedSettings ?? DEFAULT_SETTINGS);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [dictationDumpOpen, setDictationDumpOpen] = useState<boolean>(false);
  const [rawSearchQuery, setRawSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const autosaveTimers = useRef<Map<keyof AppSettings, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  useEffect(() => {
    if (activeCategory === "llm") {
      onLoadCapabilities();
      onLoadModels();
    }
  }, [activeCategory, onLoadCapabilities, onLoadModels]);

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
    if (activeCategory !== "llm") {
      return undefined;
    }
    const trimmed = draft.llmEndpoint.trim();
    if (!isValidUrl(trimmed)) {
      return undefined;
    }
    const handle = window.setTimeout(() => {
      onLoadModels();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [activeCategory, draft.llmEndpoint, onLoadModels]);

  useEffect(() => {
    const categoryParam = searchParams.get("category") as CategoryKey | null;
    if (categoryParam && ["general", "voice", "llm", "knowledge", "system"].includes(categoryParam)) {
      setActiveCategory(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const focusParam = searchParams.get("focus");
    if (!focusParam) return;
    const categoryMap: Record<string, CategoryKey> = {
      language: "general",
      themeMode: "general",
      sidecarEnrichmentEnabled: "general",
      llmEndpoint: "llm",
      llmModel: "llm",
      llmApiKey: "llm",
      whisperModelPath: "voice",
      vadModelPath: "voice",
      whisperThreads: "voice",
      dictationKeyboardHotkey: "voice",
      dictationPushToTalk: "voice",
      dictationDumpEnabled: "voice",
      dictationDumpHotkeyToggle: "voice",
      dictationDumpHotkeyHold: "voice",
      obsidianApiHost: "knowledge",
      obsidianApiToken: "knowledge",
      vaultPath: "knowledge",
      syncthingEnabled: "system",
      syncthingObsidianVaultPath: "system",
    };
    const cat = categoryMap[focusParam];
    if (cat) {
      setActiveCategory(cat);
      setFocusedKey(focusParam);
      const ringTimeout = window.setTimeout(() => setFocusedKey(null), 2000);
      return () => window.clearTimeout(ringTimeout);
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    const handle = window.setTimeout(() => setSearchQuery(rawSearchQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [rawSearchQuery]);

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const saveField = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setDraft((prev) => {
        const next = { ...prev, [key]: value };
        onSave(next);
        return next;
      });
    },
    [onSave]
  );

  const scheduleAutosave = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const existing = autosaveTimers.current.get(key);
      if (existing !== undefined) clearTimeout(existing);
      const handle = window.setTimeout(() => {
        autosaveTimers.current.delete(key);
        saveField(key, value);
      }, AUTOSAVE_DEBOUNCE_MS);
      autosaveTimers.current.set(key, handle);
    },
    [saveField]
  );

  const handleBlurSave = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const existing = autosaveTimers.current.get(key);
      if (existing !== undefined) {
        clearTimeout(existing);
        autosaveTimers.current.delete(key);
      }
      saveField(key, value);
    },
    [saveField]
  );

  const pickWhisperFile = async () => {
    if (!window.mozgoslav) return;
    const res = await window.mozgoslav.openAudioFiles();
    if (!res.canceled && res.filePaths[0]) {
      const newPath = res.filePaths[0];
      update("whisperModelPath", newPath);
      saveField("whisperModelPath", newPath);
    }
  };

  const llmEndpointError = useMemo(() => {
    const trimmed = draft.llmEndpoint.trim();
    if (trimmed.length === 0) return undefined;
    return isValidUrl(trimmed) ? undefined : t("settings.validation.invalidUrl");
  }, [draft.llmEndpoint, t]);

  const obsidianHostError = useMemo(() => {
    const trimmed = draft.obsidianApiHost.trim();
    if (trimmed.length === 0) return undefined;
    return isValidUrl(trimmed) ? undefined : t("settings.validation.invalidUrl");
  }, [draft.obsidianApiHost, t]);

  const allFields = useMemo((): SettingField[] => {
    return [
      { key: "language", label: t("settings.fields.language"), description: t("settings.fields.languageDesc"), category: "general", value: draft.language, defaultValue: DEFAULT_SETTINGS.language },
      { key: "themeMode", label: t("settings.fields.theme"), description: t("settings.fields.themeDesc"), category: "general", value: draft.themeMode, defaultValue: DEFAULT_SETTINGS.themeMode },
      { key: "sidecarEnrichmentEnabled", label: t("settings.sidecarEnrichment.label"), description: t("settings.sidecarEnrichment.description"), category: "general", value: draft.sidecarEnrichmentEnabled, defaultValue: DEFAULT_SETTINGS.sidecarEnrichmentEnabled },
      { key: "whisperModelPath", label: t("settings.fields.whisperModelPath"), description: t("settings.fields.whisperModelPathDesc"), category: "voice", value: draft.whisperModelPath, defaultValue: DEFAULT_SETTINGS.whisperModelPath },
      { key: "vadModelPath", label: t("settings.fields.vadModelPath"), description: t("settings.fields.vadModelPathDesc"), category: "voice", value: draft.vadModelPath, defaultValue: DEFAULT_SETTINGS.vadModelPath },
      { key: "whisperThreads", label: t("settings.fields.whisperThreads"), description: t("settings.fields.whisperThreadsDesc"), category: "voice", value: draft.whisperThreads, defaultValue: DEFAULT_SETTINGS.whisperThreads },
      { key: "dictationKeyboardHotkey", label: t("settings.fields.dictationKeyboardHotkey"), description: t("settings.fields.dictationKeyboardHotkeyDesc"), category: "voice", value: draft.dictationKeyboardHotkey, defaultValue: DEFAULT_SETTINGS.dictationKeyboardHotkey },
      { key: "dictationPushToTalk", label: t("settings.fields.dictationPushToTalk"), description: t("settings.fields.dictationPushToTalkDesc"), category: "voice", value: draft.dictationPushToTalk, defaultValue: DEFAULT_SETTINGS.dictationPushToTalk },
      { key: "dictationDumpEnabled", label: t("settings.fields.dictationDumpEnabled"), description: t("settings.fields.dictationDumpEnabledDesc"), category: "voice", value: draft.dictationDumpEnabled, defaultValue: DEFAULT_SETTINGS.dictationDumpEnabled },
      { key: "dictationDumpHotkeyToggle", label: t("settings.fields.dictationDumpHotkeyToggle"), description: t("settings.dumpHotkeyToggleHint"), category: "voice", value: draft.dictationDumpHotkeyToggle, defaultValue: DEFAULT_SETTINGS.dictationDumpHotkeyToggle },
      { key: "dictationDumpHotkeyHold", label: t("settings.fields.dictationDumpHotkeyHold"), description: t("settings.dumpHotkeyHoldHint"), category: "voice", value: draft.dictationDumpHotkeyHold, defaultValue: DEFAULT_SETTINGS.dictationDumpHotkeyHold },
      { key: "llmEndpoint", label: t("settings.fields.llmEndpoint"), description: t("settings.fields.llmEndpointDesc"), category: "llm", value: draft.llmEndpoint, defaultValue: DEFAULT_SETTINGS.llmEndpoint },
      { key: "llmModel", label: t("settings.llmModels.label"), description: t("settings.fields.llmModelDesc"), category: "llm", value: draft.llmModel, defaultValue: DEFAULT_SETTINGS.llmModel },
      { key: "llmApiKey", label: t("settings.fields.llmApiKey"), description: t("settings.tokenHint"), category: "llm", value: draft.llmApiKey, defaultValue: DEFAULT_SETTINGS.llmApiKey },
      { key: "obsidianApiHost", label: t("settings.fields.obsidianApiHost"), description: t("settings.fields.obsidianApiHostDesc"), category: "knowledge", value: draft.obsidianApiHost, defaultValue: DEFAULT_SETTINGS.obsidianApiHost },
      { key: "obsidianApiToken", label: t("settings.fields.obsidianApiToken"), description: t("settings.tokenHint"), category: "knowledge", value: draft.obsidianApiToken, defaultValue: DEFAULT_SETTINGS.obsidianApiToken },
      { key: "syncthingEnabled", label: t("sync.settings.enableSyncthing"), description: t("settings.fields.syncthingEnabledDesc"), category: "system", value: draft.syncthingEnabled, defaultValue: DEFAULT_SETTINGS.syncthingEnabled },
    ];
  }, [draft, t]);

  const filteredFields = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return allFields;
    if (q === "@modified") return allFields.filter((f) => f.value !== f.defaultValue);
    if (q === "@default") return allFields.filter((f) => f.value === f.defaultValue);
    const lower = q.toLowerCase();
    return allFields.filter(
      (f) =>
        f.label.toLowerCase().includes(lower) ||
        (f.description ?? "").toLowerCase().includes(lower)
    );
  }, [allFields, searchQuery]);

  const isFiltering = searchQuery.trim().length > 0;

  const categories: { key: CategoryKey; label: string }[] = useMemo(
    () => [
      { key: "general", label: t("settings.categories.general") },
      { key: "voice", label: t("settings.categories.voice") },
      { key: "llm", label: t("settings.categories.llm") },
      { key: "knowledge", label: t("settings.categories.knowledge") },
      { key: "system", label: t("settings.categories.system") },
    ],
    [t]
  );

  const activeCategoryLabel =
    categories.find((c) => c.key === activeCategory)?.label ?? "";

  const checkLlm = () => {
    onCheckLlm();
  };

  return (
    <SettingsRoot data-testid="settings-root">
      <SettingsSidebar aria-label={t("settings.title")}>
        {categories.map((cat) => (
          <SidebarCategory
            key={cat.key}
            $active={activeCategory === cat.key}
            onClick={() => setActiveCategory(cat.key)}
            data-testid={`settings-sidebar-${cat.key}`}
          >
            {cat.label}
          </SidebarCategory>
        ))}
      </SettingsSidebar>

      <SettingsContent>
        <StickyHeader>
          <Breadcrumb>
            {t("settings.title")} / {activeCategoryLabel}
          </Breadcrumb>
          <SearchInput
            data-testid="settings-search"
            placeholder={t("settings.searchPlaceholder")}
            value={rawSearchQuery}
            onChange={(e) => setRawSearchQuery(e.target.value)}
            aria-label={t("settings.searchPlaceholder")}
          />
        </StickyHeader>

        <ContentScroll ref={contentRef}>
          {isFiltering ? (
            filteredFields.length === 0 ? (
              <SearchEmptyState data-testid="settings-search-empty">
                {t("settings.searchEmpty", { query: searchQuery })}
              </SearchEmptyState>
            ) : (
              <CategorySection>
                {filteredFields.map((field) => {
                  const catLabel = categories.find((c) => c.key === field.category)?.label ?? "";
                  return (
                    <SubSection key={field.key} data-field-key={field.key}>
                      <SubSectionTitle>
                        {catLabel} — {highlightMatch(field.label, searchQuery)}
                      </SubSectionTitle>
                      {field.description && (
                        <FieldHint>{highlightMatch(field.description, searchQuery)}</FieldHint>
                      )}
                    </SubSection>
                  );
                })}
              </CategorySection>
            )
          ) : (
            <>
              {activeCategory === "general" && (
                <GeneralCategory
                  draft={draft}
                  update={update}
                  handleBlurSave={handleBlurSave}
                  scheduleAutosave={scheduleAutosave}
                  advancedOpen={advancedOpen}
                  setAdvancedOpen={setAdvancedOpen}
                  focusedKey={focusedKey}
                  t={t}
                />
              )}

              {activeCategory === "voice" && (
                <VoiceCategory
                  draft={draft}
                  update={update}
                  handleBlurSave={handleBlurSave}
                  scheduleAutosave={scheduleAutosave}
                  pickWhisperFile={pickWhisperFile}
                  dictationDumpOpen={dictationDumpOpen}
                  setDictationDumpOpen={setDictationDumpOpen}
                  focusedKey={focusedKey}
                  t={t}
                />
              )}

              {activeCategory === "llm" && (
                <LlmCategory
                  draft={draft}
                  update={update}
                  handleBlurSave={handleBlurSave}
                  scheduleAutosave={scheduleAutosave}
                  llmEndpointError={llmEndpointError}
                  llmCapabilities={llmCapabilities}
                  llmModels={llmModels}
                  llmModelsLoading={llmModelsLoading}
                  isLlmProbing={isLlmProbing}
                  checkLlm={checkLlm}
                  focusedKey={focusedKey}
                  t={t}
                />
              )}

              {activeCategory === "knowledge" && (
                <KnowledgeCategory
                  draft={draft}
                  update={update}
                  handleBlurSave={handleBlurSave}
                  scheduleAutosave={scheduleAutosave}
                  obsidianHostError={obsidianHostError}
                  focusedKey={focusedKey}
                  t={t}
                />
              )}

              {activeCategory === "system" && (
                <SystemCategory
                  draft={draft}
                  update={update}
                  handleBlurSave={handleBlurSave}
                  focusedKey={focusedKey}
                  t={t}
                />
              )}
            </>
          )}
        </ContentScroll>
      </SettingsContent>
    </SettingsRoot>
  );
};

interface CategoryProps {
  draft: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  handleBlurSave: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  scheduleAutosave: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  focusedKey: string | null;
  t: ReturnType<typeof useTranslation>["t"];
}

const GeneralCategory: FC<
  CategoryProps & {
    advancedOpen: boolean;
    setAdvancedOpen: (v: boolean) => void;
  }
> = ({ draft, update, handleBlurSave, scheduleAutosave, advancedOpen, setAdvancedOpen, focusedKey, t }) => (
  <CategorySection id="settings-category-general" data-testid="settings-category-general">
    <CategoryTitle>{t("settings.categories.general")}</CategoryTitle>

    <SubSection>
      <SubSectionTitle>{t("settings.sections.uiAndLanguage")}</SubSectionTitle>
      <Card>
        <FormGrid>
          <FieldRing $active={focusedKey === "language"} data-testid="field-language">
            <label>{t("settings.fields.language")}</label>
            <FieldHint>{t("settings.fields.languageDesc")}</FieldHint>
            <SelectBox
              value={draft.language}
              onChange={(e) => update("language", e.target.value)}
              onBlur={(e) => handleBlurSave("language", e.target.value)}
            >
              <SelectOption value="ru">Русский</SelectOption>
              <SelectOption value="en">English</SelectOption>
            </SelectBox>
          </FieldRing>
          <FieldRing $active={focusedKey === "themeMode"} data-testid="field-themeMode">
            <label>{t("settings.fields.theme")}</label>
            <FieldHint>{t("settings.fields.themeDesc")}</FieldHint>
            <SelectBox
              value={draft.themeMode}
              onChange={(e) => {
                const v = e.target.value as AppSettings["themeMode"];
                update("themeMode", v);
              }}
              onBlur={(e) => handleBlurSave("themeMode", e.target.value as AppSettings["themeMode"])}
            >
              <SelectOption value="system">{t("settings.theme.system")}</SelectOption>
              <SelectOption value="light">{t("settings.theme.light")}</SelectOption>
              <SelectOption value="dark">{t("settings.theme.dark")}</SelectOption>
            </SelectBox>
          </FieldRing>
        </FormGrid>
      </Card>
    </SubSection>

    <Section>
      <SectionHeader
        type="button"
        $expanded={advancedOpen}
        onClick={() => setAdvancedOpen(!advancedOpen)}
        data-testid="settings-section-advanced"
        aria-expanded={advancedOpen}
      >
        {t("settings.sections.advanced")}
      </SectionHeader>
      {advancedOpen && (
        <Card>
          <FormGrid>
            <FieldRing $active={focusedKey === "sidecarEnrichmentEnabled"} data-testid="field-sidecarEnrichmentEnabled">
              <CheckboxRow>
                <input
                  type="checkbox"
                  data-testid="settings-sidecar-enrichment-enabled"
                  checked={draft.sidecarEnrichmentEnabled}
                  onChange={(e) => {
                    update("sidecarEnrichmentEnabled", e.target.checked);
                    handleBlurSave("sidecarEnrichmentEnabled", e.target.checked);
                  }}
                />
                <span>{t("settings.sidecarEnrichment.label")}</span>
              </CheckboxRow>
              <FieldHint>{t("settings.sidecarEnrichment.description")}</FieldHint>
            </FieldRing>
          </FormGrid>
        </Card>
      )}
    </Section>
  </CategorySection>
);

const VoiceCategory: FC<
  CategoryProps & {
    pickWhisperFile: () => Promise<void>;
    dictationDumpOpen: boolean;
    setDictationDumpOpen: (v: boolean) => void;
  }
> = ({ draft, update, handleBlurSave, scheduleAutosave, pickWhisperFile, dictationDumpOpen, setDictationDumpOpen, focusedKey, t }) => (
  <CategorySection id="settings-category-voice" data-testid="settings-category-voice">
    <CategoryTitle>{t("settings.categories.voice")}</CategoryTitle>

    <SubSection>
      <SubSectionTitle>{t("settings.sections.transcription")}</SubSectionTitle>
      <Card>
        <FormGrid>
          <FieldRing $active={focusedKey === "whisperModelPath"} data-testid="field-whisperModelPath">
            <Row>
              <Input
                label={t("settings.fields.whisperModelPath")}
                value={draft.whisperModelPath}
                onChange={(e) => update("whisperModelPath", e.target.value)}
                onBlur={(e) => handleBlurSave("whisperModelPath", e.target.value)}
              />
              <Button
                variant="secondary"
                leftIcon={<FolderOpen size={16} />}
                onClick={pickWhisperFile}
              >
                {t("common.add")}
              </Button>
            </Row>
          </FieldRing>
          <FieldRing $active={focusedKey === "vadModelPath"} data-testid="field-vadModelPath">
            <Input
              label={t("settings.fields.vadModelPath")}
              value={draft.vadModelPath}
              onChange={(e) => {
                update("vadModelPath", e.target.value);
                scheduleAutosave("vadModelPath", e.target.value);
              }}
              onBlur={(e) => handleBlurSave("vadModelPath", e.target.value)}
            />
          </FieldRing>
          <FieldRing $active={focusedKey === "whisperThreads"} data-testid="field-whisperThreads">
            <Input
              type="number"
              label={t("settings.fields.whisperThreads")}
              value={draft.whisperThreads}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                update("whisperThreads", v);
                scheduleAutosave("whisperThreads", v);
              }}
              onBlur={(e) => handleBlurSave("whisperThreads", Number(e.target.value) || 0)}
            />
          </FieldRing>
        </FormGrid>
      </Card>
    </SubSection>

    <SubSection>
      <SubSectionTitle>{t("settings.sections.dictationCore")}</SubSectionTitle>
      <Card>
        <FormGrid>
          <FieldRing $active={focusedKey === "dictationKeyboardHotkey"} data-testid="field-dictationKeyboardHotkey">
            <label>{t("settings.fields.dictationKeyboardHotkey")}</label>
            <FieldHint>{t("settings.fields.dictationKeyboardHotkeyDesc")}</FieldHint>
            <HotkeyRecorder
              value={draft.dictationKeyboardHotkey}
              onChange={(accelerator) => {
                update("dictationKeyboardHotkey", accelerator);
                handleBlurSave("dictationKeyboardHotkey", accelerator);
              }}
              hint={t("settings.hotkeyHint")}
              testId="dictation"
            />
          </FieldRing>
          <FieldRing $active={focusedKey === "dictationPushToTalk"} data-testid="field-dictationPushToTalk">
            <CheckboxRow>
              <input
                type="checkbox"
                data-testid="settings-dictation-push-to-talk"
                checked={draft.dictationPushToTalk}
                onChange={(e) => {
                  update("dictationPushToTalk", e.target.checked);
                  handleBlurSave("dictationPushToTalk", e.target.checked);
                }}
              />
              <span>{t("settings.fields.dictationPushToTalk")}</span>
            </CheckboxRow>
            <FieldHint>{t("settings.fields.dictationPushToTalkDesc")}</FieldHint>
          </FieldRing>
        </FormGrid>
      </Card>
    </SubSection>

    <Section>
      <SectionHeader
        type="button"
        $expanded={dictationDumpOpen}
        onClick={() => setDictationDumpOpen(!dictationDumpOpen)}
        data-testid="settings-section-dictation-dump"
        aria-expanded={dictationDumpOpen}
      >
        {t("settings.sections.dictationDump")}
      </SectionHeader>
      {dictationDumpOpen && (
        <Card>
          <FormGrid>
            <FieldRing $active={focusedKey === "dictationDumpEnabled"} data-testid="field-dictationDumpEnabled">
              <CheckboxRow>
                <input
                  type="checkbox"
                  data-testid="settings-dictation-dump-enabled"
                  checked={draft.dictationDumpEnabled}
                  onChange={(e) => {
                    update("dictationDumpEnabled", e.target.checked);
                    handleBlurSave("dictationDumpEnabled", e.target.checked);
                  }}
                />
                <span>{t("settings.fields.dictationDumpEnabled")}</span>
              </CheckboxRow>
              <FieldHint>{t("settings.fields.dictationDumpEnabledDesc")}</FieldHint>
            </FieldRing>
            <FieldRing $active={focusedKey === "dictationDumpHotkeyToggle"} data-testid="field-dictationDumpHotkeyToggle">
              <label>{t("settings.fields.dictationDumpHotkeyToggle")}</label>
              <HotkeyRecorder
                value={draft.dictationDumpHotkeyToggle}
                onChange={(accelerator) => {
                  update("dictationDumpHotkeyToggle", accelerator);
                  handleBlurSave("dictationDumpHotkeyToggle", accelerator);
                }}
                hint={t("settings.dumpHotkeyToggleHint")}
                testId="dictation-dump-toggle"
              />
            </FieldRing>
            <FieldRing $active={focusedKey === "dictationDumpHotkeyHold"} data-testid="field-dictationDumpHotkeyHold">
              <label>{t("settings.fields.dictationDumpHotkeyHold")}</label>
              <HotkeyRecorder
                value={draft.dictationDumpHotkeyHold}
                onChange={(accelerator) => {
                  update("dictationDumpHotkeyHold", accelerator);
                  handleBlurSave("dictationDumpHotkeyHold", accelerator);
                }}
                hint={t("settings.dumpHotkeyHoldHint")}
                testId="dictation-dump-hold"
              />
            </FieldRing>
          </FormGrid>
        </Card>
      )}
    </Section>
  </CategorySection>
);

interface LlmCategoryProps extends CategoryProps {
  llmEndpointError: string | undefined;
  llmCapabilities: LlmCapabilities | null;
  llmModels: readonly LlmModelDescriptor[];
  llmModelsLoading: boolean;
  isLlmProbing: boolean;
  checkLlm: () => void;
}

const LlmCategory: FC<LlmCategoryProps> = ({
  draft,
  update,
  handleBlurSave,
  scheduleAutosave,
  llmEndpointError,
  llmCapabilities,
  llmModels,
  llmModelsLoading,
  isLlmProbing,
  checkLlm,
  focusedKey,
  t,
}) => (
  <CategorySection id="settings-category-llm" data-testid="settings-category-llm">
    <CategoryTitle>{t("settings.categories.llm")}</CategoryTitle>

    <SubSection>
      <SubSectionTitle>{t("settings.sections.llmCore")}</SubSectionTitle>
      <Card>
        <FormGrid>
          <FieldRing $active={focusedKey === "llmEndpoint"} data-testid="field-llmEndpoint">
            <Input
              label={t("settings.fields.llmEndpoint")}
              value={draft.llmEndpoint}
              onChange={(e) => {
                update("llmEndpoint", e.target.value);
                scheduleAutosave("llmEndpoint", e.target.value);
              }}
              onBlur={(e) => handleBlurSave("llmEndpoint", e.target.value)}
              placeholder={HTTP_PROTOCOL}
              error={llmEndpointError}
            />
            <FieldHint>{t("settings.fields.llmEndpointDesc")}</FieldHint>
          </FieldRing>
          <FieldRing $active={focusedKey === "llmModel"} data-testid="field-llmModel">
            <label>{t("settings.llmModels.label")}</label>
            <FieldHint>{t("settings.fields.llmModelDesc")}</FieldHint>
            <SelectBox
              value={draft.llmModel}
              onChange={(e) => {
                update("llmModel", e.target.value);
                handleBlurSave("llmModel", e.target.value);
              }}
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
                      <LlmModelBadges key={m.id} model={m} />
                    ))}
                </CapabilityBadges>
              </ModelOption>
            )}
          </FieldRing>
          <FieldRing $active={focusedKey === "llmApiKey"} data-testid="field-llmApiKey">
            <Input
              label={t("settings.fields.llmApiKey")}
              value={draft.llmApiKey}
              onChange={(e) => {
                update("llmApiKey", e.target.value);
                scheduleAutosave("llmApiKey", e.target.value);
              }}
              onBlur={(e) => handleBlurSave("llmApiKey", e.target.value)}
              sensitive
              hint={t("settings.tokenHint")}
            />
          </FieldRing>
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
    </SubSection>
  </CategorySection>
);

interface KnowledgeCategoryProps extends CategoryProps {
  obsidianHostError: string | undefined;
}

const KnowledgeCategory: FC<KnowledgeCategoryProps> = ({
  draft,
  update,
  handleBlurSave,
  scheduleAutosave,
  obsidianHostError,
  focusedKey,
  t,
}) => (
  <CategorySection id="settings-category-knowledge" data-testid="settings-category-knowledge">
    <CategoryTitle>{t("settings.categories.knowledge")}</CategoryTitle>

    <SubSection>
      <SubSectionTitle>{t("settings.sections.obsidian")}</SubSectionTitle>
      <Card>
        <FormGrid>
          <FieldRing $active={focusedKey === "obsidianApiHost"} data-testid="field-obsidianApiHost">
            <Input
              label={t("settings.fields.obsidianApiHost")}
              value={draft.obsidianApiHost}
              onChange={(e) => {
                update("obsidianApiHost", e.target.value);
                scheduleAutosave("obsidianApiHost", e.target.value);
              }}
              onBlur={(e) => handleBlurSave("obsidianApiHost", e.target.value)}
              placeholder={HTTP_PROTOCOL}
              error={obsidianHostError}
            />
            <FieldHint>{t("settings.fields.obsidianApiHostDesc")}</FieldHint>
          </FieldRing>
          <FieldRing $active={focusedKey === "obsidianApiToken"} data-testid="field-obsidianApiToken">
            <Input
              label={t("settings.fields.obsidianApiToken")}
              value={draft.obsidianApiToken}
              onChange={(e) => {
                update("obsidianApiToken", e.target.value);
                scheduleAutosave("obsidianApiToken", e.target.value);
              }}
              onBlur={(e) => handleBlurSave("obsidianApiToken", e.target.value)}
              sensitive
              hint={t("settings.tokenHint")}
            />
          </FieldRing>
        </FormGrid>
      </Card>
    </SubSection>

    <SubSection id="settings-knowledge-profiles" data-testid="settings-knowledge-profiles">
      <SubSectionTitle>{t("profiles.title")}</SubSectionTitle>
      <ProfilesContainer />
    </SubSection>

    <SubSection>
      <SubSectionTitle>{t("settings.sections.sync")}</SubSectionTitle>
      <SyncPairing />
    </SubSection>
  </CategorySection>
);

interface SystemCategoryProps extends CategoryProps {}

const SystemCategory: FC<SystemCategoryProps> = ({ draft, update, handleBlurSave, focusedKey, t }) => (
  <CategorySection id="settings-category-system" data-testid="settings-category-system">
    <CategoryTitle>{t("settings.categories.system")}</CategoryTitle>

    <SubSection>
      <SubSectionTitle>{t("settings.sections.systemLinks")}</SubSectionTitle>
      <SystemLinksGrid data-testid="settings-system-links">
        <SystemLinkCard href="/models?type=STT" data-testid="settings-system-link-models-whisper">
          <span>{t("settings.systemLinks.manageModels")}</span>
          <span>→</span>
        </SystemLinkCard>
        <SystemLinkCard href="/models" data-testid="settings-system-link-models">
          <span>{t("settings.systemLinks.allModels")}</span>
          <span>→</span>
        </SystemLinkCard>
        <SystemLinkCard href="/backup" data-testid="settings-system-link-backups">
          <span>{t("settings.systemLinks.viewBackups")}</span>
          <span>→</span>
        </SystemLinkCard>
        <SystemLinkCard href="/routines" data-testid="settings-system-link-routines">
          <span>{t("settings.systemLinks.viewRoutines")}</span>
          <span>→</span>
        </SystemLinkCard>
      </SystemLinksGrid>
    </SubSection>

    <SubSection>
      <SubSectionTitle>{t("settings.sections.syncState")}</SubSectionTitle>
      <Card>
        <FormGrid>
          <FieldRing $active={focusedKey === "syncthingEnabled"} data-testid="field-syncthingEnabled">
            <CheckboxRow>
              <input
                type="checkbox"
                data-testid="settings-syncthing-enabled"
                checked={draft.syncthingEnabled}
                onChange={(e) => {
                  update("syncthingEnabled", e.target.checked);
                  handleBlurSave("syncthingEnabled", e.target.checked);
                }}
              />
              <span>{t("sync.settings.enableSyncthing")}</span>
            </CheckboxRow>
            <FieldHint>{t("settings.fields.syncthingEnabledDesc")}</FieldHint>
          </FieldRing>
        </FormGrid>
      </Card>
    </SubSection>

    <SubSection>
      <SubSectionTitle>{t("systemActions.title")}</SubSectionTitle>
      <SystemActionsFeature />
    </SubSection>
  </CategorySection>
);

interface LlmModelBadgesProps {
  readonly model: {
    readonly contextLength?: number | null;
    readonly supportsToolCalling?: boolean | null;
    readonly supportsJsonMode?: boolean | null;
    readonly ownedBy?: string | null;
  };
}

const LlmModelBadges: FC<LlmModelBadgesProps> = ({ model }) => {
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
