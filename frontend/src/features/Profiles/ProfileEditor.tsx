import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { Profile } from "../../domain/Profile";
import { CleanupLevel } from "../../domain/enums";
import {
  Column,
  FieldError,
  GlossaryLanguageBlock,
  GlossaryLanguageHeader,
  GlossarySection,
  HintText,
  LlmOverrideSection,
  SectionLabel,
  SelectBox,
  SelectOption,
  SuggestChip,
  SuggestChipRow,
  TagEditor,
  TagPill,
  TextArea,
  ToggleRow,
} from "./ProfileEditor.style";

const COMMON_LANGUAGES = ["en", "ru", "de", "fr", "es", "zh", "ja", "ko", "pt", "it", "default"];

export interface ProfileEditorProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: ProfileDraft) => void | Promise<void>;
  onSuggest: (profileId: string, language: string) => void;
  suggestions: Record<string, Record<string, string[]>>;
  suggestingKey: string | null;
}

export interface ProfileDraft {
  id?: string;
  name: string;
  systemPrompt: string;
  transcriptionPromptOverride: string;
  outputTemplate: string;
  cleanupLevel: CleanupLevel;
  exportFolder: string;
  autoTags: string[];
  isDefault: boolean;
  glossaryByLanguage: Record<string, string[]>;
  llmCorrectionEnabled: boolean;
  llmProviderOverride: string;
  llmModelOverride: string;
}

const emptyDraft = (): ProfileDraft => ({
  name: "",
  systemPrompt: "",
  transcriptionPromptOverride: "",
  outputTemplate: "",
  cleanupLevel: "Light",
  exportFolder: "_inbox",
  autoTags: [],
  isDefault: false,
  glossaryByLanguage: {},
  llmCorrectionEnabled: false,
  llmProviderOverride: "",
  llmModelOverride: "",
});

const ProfileEditor: FC<ProfileEditorProps> = ({
  profile,
  isOpen,
  onClose,
  onSave,
  onSuggest,
  suggestions,
  suggestingKey,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [tagDraft, setTagDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [newLang, setNewLang] = useState("");
  const [termDrafts, setTermDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setDraft({
        id: profile.id,
        name: profile.name,
        systemPrompt: profile.systemPrompt,
        transcriptionPromptOverride: profile.transcriptionPromptOverride ?? "",
        outputTemplate: profile.outputTemplate ?? "",
        cleanupLevel: profile.cleanupLevel,
        exportFolder: profile.exportFolder,
        autoTags: [...profile.autoTags],
        isDefault: profile.isDefault,
        glossaryByLanguage: Object.fromEntries(
          Object.entries(profile.glossaryByLanguage ?? {}).map(([lang, terms]) => [
            lang,
            [...terms],
          ])
        ),
        llmCorrectionEnabled: profile.llmCorrectionEnabled,
        llmProviderOverride: profile.llmProviderOverride ?? "",
        llmModelOverride: profile.llmModelOverride ?? "",
      });
    } else {
      setDraft(emptyDraft());
    }
    setTagDraft("");
    setTermDrafts({});
    setNewLang("");
    setNameError(null);
  }, [profile, isOpen]);

  const update = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const addTag = () => {
    const value = tagDraft.trim();
    if (!value || draft.autoTags.includes(value)) return;
    setDraft((prev) => ({ ...prev, autoTags: [...prev.autoTags, value] }));
    setTagDraft("");
  };

  const removeTag = (tag: string) =>
    setDraft((prev) => ({ ...prev, autoTags: prev.autoTags.filter((t) => t !== tag) }));

  const addLanguage = () => {
    const lang = newLang.trim().toLowerCase();
    if (!lang || draft.glossaryByLanguage[lang] !== undefined) return;
    setDraft((prev) => ({
      ...prev,
      glossaryByLanguage: { ...prev.glossaryByLanguage, [lang]: [] },
    }));
    setNewLang("");
  };

  const removeLanguage = (lang: string) => {
    setDraft((prev) => {
      const next = { ...prev.glossaryByLanguage };
      delete next[lang];
      return { ...prev, glossaryByLanguage: next };
    });
  };

  const addTerm = (lang: string) => {
    const term = (termDrafts[lang] ?? "").trim();
    if (!term || (draft.glossaryByLanguage[lang] ?? []).includes(term)) return;
    setDraft((prev) => ({
      ...prev,
      glossaryByLanguage: {
        ...prev.glossaryByLanguage,
        [lang]: [...(prev.glossaryByLanguage[lang] ?? []), term],
      },
    }));
    setTermDrafts((prev) => ({ ...prev, [lang]: "" }));
  };

  const removeTerm = (lang: string, term: string) => {
    setDraft((prev) => ({
      ...prev,
      glossaryByLanguage: {
        ...prev.glossaryByLanguage,
        [lang]: (prev.glossaryByLanguage[lang] ?? []).filter((t) => t !== term),
      },
    }));
  };

  const acceptSuggestion = (lang: string, term: string) => {
    const existing = draft.glossaryByLanguage[lang] ?? [];
    if (existing.includes(term)) return;
    setDraft((prev) => ({
      ...prev,
      glossaryByLanguage: {
        ...prev.glossaryByLanguage,
        [lang]: [...(prev.glossaryByLanguage[lang] ?? []), term],
      },
    }));
  };

  const handleSuggest = (lang: string) => {
    if (!draft.id) return;
    onSuggest(draft.id, lang);
  };

  const submit = async () => {
    if (!draft.name.trim()) {
      setNameError(t("profiles.fields.nameRequired"));
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const glossaryLanguages = Object.keys(draft.glossaryByLanguage);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={profile ? t("common.edit") : t("profiles.addNew")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            data-testid="profile-editor-save"
            variant="primary"
            onClick={submit}
            isLoading={saving}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <Column>
        <Input
          data-testid="profile-field-name"
          label={t("profiles.fields.name")}
          value={draft.name}
          onChange={(e) => {
            update("name", e.target.value);
            if (nameError) setNameError(null);
          }}
          autoFocus
        />
        {nameError && <FieldError data-testid="profile-field-name-error">{nameError}</FieldError>}

        <div>
          <label>{t("profiles.fields.cleanupLevel")}</label>
          <SelectBox
            value={draft.cleanupLevel}
            onChange={(e) => update("cleanupLevel", e.target.value as CleanupLevel)}
          >
            <SelectOption value="None">{t("profiles.cleanup.None")}</SelectOption>
            <SelectOption value="Light">{t("profiles.cleanup.Light")}</SelectOption>
            <SelectOption value="Aggressive">{t("profiles.cleanup.Aggressive")}</SelectOption>
          </SelectBox>
        </div>

        <Input
          label={t("profiles.fields.exportFolder")}
          value={draft.exportFolder}
          onChange={(e) => update("exportFolder", e.target.value)}
          placeholder="_inbox"
        />

        <div>
          <label>{t("profiles.fields.systemPrompt")}</label>
          <TextArea
            value={draft.systemPrompt}
            onChange={(e) => update("systemPrompt", e.target.value)}
            rows={6}
            spellCheck={false}
          />
        </div>

        <div>
          <label>{t("profiles.fields.transcriptionPromptOverride")}</label>
          <TextArea
            value={draft.transcriptionPromptOverride}
            onChange={(e) => update("transcriptionPromptOverride", e.target.value)}
            rows={2}
            spellCheck={false}
          />
        </div>

        <div>
          <label>{t("profiles.fields.autoTags")}</label>
          <TagEditor>
            {draft.autoTags.map((tag) => (
              <TagPill key={tag} onClick={() => removeTag(tag)}>
                {tag} ×
              </TagPill>
            ))}
            <Input
              value={tagDraft}
              placeholder="+ tag"
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
          </TagEditor>
        </div>

        <div>
          <SectionLabel>{t("profileEditor.glossary.title")}</SectionLabel>
          <GlossarySection>
            {glossaryLanguages.map((lang) => {
              const terms = draft.glossaryByLanguage[lang] ?? [];
              const suggestionKey = `${draft.id}:${lang}`;
              const isSuggesting = suggestingKey === suggestionKey;
              const langSuggestions =
                draft.id !== undefined ? (suggestions[draft.id]?.[lang] ?? null) : null;
              const newSuggestions = langSuggestions
                ? langSuggestions.filter((s) => !terms.includes(s))
                : null;

              return (
                <GlossaryLanguageBlock key={lang}>
                  <GlossaryLanguageHeader>
                    <strong>{lang.toUpperCase()}</strong>
                    <Button
                      variant="ghost"
                      onClick={() => removeLanguage(lang)}
                    >
                      {t("common.delete")}
                    </Button>
                  </GlossaryLanguageHeader>
                  <TagEditor>
                    {terms.map((term) => (
                      <TagPill key={term} onClick={() => removeTerm(lang, term)}>
                        {term} ×
                      </TagPill>
                    ))}
                    <Input
                      value={termDrafts[lang] ?? ""}
                      placeholder={t("profileEditor.glossary.addTerm")}
                      onChange={(e) =>
                        setTermDrafts((prev) => ({ ...prev, [lang]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTerm(lang);
                        }
                      }}
                    />
                  </TagEditor>
                  {draft.id && (
                    <Button
                      variant="ghost"
                      onClick={() => handleSuggest(lang)}
                      isLoading={isSuggesting}
                    >
                      {t("profileEditor.glossary.suggest")}
                    </Button>
                  )}
                  {newSuggestions !== null && newSuggestions.length === 0 && (
                    <HintText>{t("profileEditor.glossary.noSuggestions")}</HintText>
                  )}
                  {newSuggestions !== null && newSuggestions.length > 0 && (
                    <SuggestChipRow>
                      {newSuggestions.map((s) => (
                        <SuggestChip key={s} onClick={() => acceptSuggestion(lang, s)}>
                          + {s}
                        </SuggestChip>
                      ))}
                    </SuggestChipRow>
                  )}
                </GlossaryLanguageBlock>
              );
            })}

            <div>
              <SelectBox
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
              >
                <SelectOption value="">{t("profileEditor.glossary.addLanguage")}</SelectOption>
                {COMMON_LANGUAGES.filter(
                  (l) => draft.glossaryByLanguage[l] === undefined
                ).map((l) => (
                  <SelectOption key={l} value={l}>
                    {t(`profileEditor.glossary.language.${l}`, { defaultValue: l.toUpperCase() })}
                  </SelectOption>
                ))}
              </SelectBox>
              <Button variant="ghost" onClick={addLanguage} disabled={!newLang}>
                {t("profileEditor.glossary.addLanguage")}
              </Button>
            </div>
          </GlossarySection>
        </div>

        <div>
          <SectionLabel>{t("profileEditor.llmOverride.label")}</SectionLabel>
          <LlmOverrideSection>
            <Input
              label={t("profileEditor.llmOverride.providerPlaceholder")}
              value={draft.llmProviderOverride}
              onChange={(e) => update("llmProviderOverride", e.target.value)}
              placeholder={t("profileEditor.llmOverride.providerPlaceholder")}
            />
            <Input
              label={t("profileEditor.llmOverride.modelPlaceholder")}
              value={draft.llmModelOverride}
              onChange={(e) => update("llmModelOverride", e.target.value)}
              placeholder={t("profileEditor.llmOverride.modelPlaceholder")}
            />
            <HintText>{t("profileEditor.llmOverride.hint")}</HintText>
          </LlmOverrideSection>
        </div>

        <ToggleRow>
          <input
            id="llm-correction-enabled"
            type="checkbox"
            checked={draft.llmCorrectionEnabled}
            onChange={(e) => update("llmCorrectionEnabled", e.target.checked)}
          />
          <label htmlFor="llm-correction-enabled">
            {t("profiles.fields.llmCorrectionEnabled")}
          </label>
        </ToggleRow>

        <ToggleRow>
          <input
            id="make-default"
            type="checkbox"
            checked={draft.isDefault}
            onChange={(e) => update("isDefault", e.target.checked)}
          />
          <label htmlFor="make-default">{t("profiles.fields.makeDefault")}</label>
        </ToggleRow>
      </Column>
    </Modal>
  );
};

export default ProfileEditor;
