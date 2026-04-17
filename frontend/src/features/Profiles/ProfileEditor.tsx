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
  SelectBox,
  SelectOption,
  TagEditor,
  TagPill,
  TextArea,
  ToggleRow,
} from "./ProfileEditor.style";

export interface ProfileEditorProps {
  profile: Profile | null; // null for create
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: ProfileDraft) => void | Promise<void>;
}

export interface ProfileDraft {
  id?: string;
  name: string;
  systemPrompt: string;
  transcriptionPromptOverride: string;
  cleanupLevel: CleanupLevel;
  exportFolder: string;
  autoTags: string[];
  isDefault: boolean;
}

const emptyDraft = (): ProfileDraft => ({
  name: "",
  systemPrompt: "",
  transcriptionPromptOverride: "",
  cleanupLevel: "Light",
  exportFolder: "_inbox",
  autoTags: [],
  isDefault: false,
});

const ProfileEditor: FC<ProfileEditorProps> = ({ profile, isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [tagDraft, setTagDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDraft({
        id: profile.id,
        name: profile.name,
        systemPrompt: profile.systemPrompt,
        transcriptionPromptOverride: profile.transcriptionPromptOverride ?? "",
        cleanupLevel: profile.cleanupLevel,
        exportFolder: profile.exportFolder,
        autoTags: [...profile.autoTags],
        isDefault: profile.isDefault,
      });
    } else {
      setDraft(emptyDraft());
    }
    setTagDraft("");
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

  const submit = async () => {
    // Client-side validation — name is the only hard-required field per
    // ADR-006 D-15.b. Backend also rejects empty names with 400 but surfacing
    // this inline avoids a round-trip.
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
        {nameError && (
          <FieldError data-testid="profile-field-name-error">{nameError}</FieldError>
        )}

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
