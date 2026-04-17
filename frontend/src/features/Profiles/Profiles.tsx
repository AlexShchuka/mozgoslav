import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Copy, Pencil, Plus, Trash2, X } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import Input from "../../components/Input";
import { api } from "../../api/MozgoslavApi";
import { Profile } from "../../types/Profile";
import { AppSettings } from "../../types/Settings";
import ProfileEditor, { ProfileDraft } from "./ProfileEditor";
import {
  AppBindingRow,
  AppBindingsCard,
  AppBindingsHint,
  AppBindingsHeader,
  BindingSelect,
  PageRoot,
  PageTitle,
  Row,
  RowActions,
  RowDescription,
  RowName,
} from "./Profiles.style";

const Profiles: FC = () => {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [newBundleId, setNewBundleId] = useState("");
  const [newProfileId, setNewProfileId] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [loadedProfiles, loadedSettings] = await Promise.all([
        api.listProfiles(),
        api.getSettings(),
      ]);
      setProfiles(loadedProfiles);
      setSettings(loadedSettings);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (profile: Profile) => { setEditing(profile); setEditorOpen(true); };

  const handleDuplicate = async (profile: Profile) => {
    try {
      await api.createProfile({
        name: t("profiles.copyOf", { name: profile.name }),
        systemPrompt: profile.systemPrompt,
        transcriptionPromptOverride: profile.transcriptionPromptOverride,
        outputTemplate: profile.outputTemplate,
        cleanupLevel: profile.cleanupLevel,
        exportFolder: profile.exportFolder,
        autoTags: [...profile.autoTags],
        isDefault: false,
      });
      toast.success(t("profiles.duplicatedToast"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (profile: Profile) => {
    if (profile.isBuiltIn) {
      toast.info(t("profiles.builtInDeleteHint"));
      return;
    }
    if (!window.confirm(t("profiles.deleteConfirm", { name: profile.name }))) return;
    try {
      await api.deleteProfile(profile.id);
      toast.success(t("profiles.deletedToast"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async (draft: ProfileDraft) => {
    const payload = {
      name: draft.name,
      systemPrompt: draft.systemPrompt,
      transcriptionPromptOverride: draft.transcriptionPromptOverride,
      outputTemplate: "",
      cleanupLevel: draft.cleanupLevel,
      exportFolder: draft.exportFolder,
      autoTags: draft.autoTags,
      isDefault: draft.isDefault,
    };
    try {
      if (draft.id) {
        await api.updateProfile(draft.id, payload);
      } else {
        await api.createProfile(payload);
      }
      toast.success(t("settings.savedToast"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const profileLabel = useMemo(() => {
    const byId = new Map(profiles.map((p) => [p.id, p.name]));
    return (id: string): string => byId.get(id) ?? id;
  }, [profiles]);

  const saveBindings = async (next: Record<string, string>) => {
    if (!settings) return;
    const updated: AppSettings = { ...settings, dictationAppProfiles: next };
    try {
      const saved = await api.saveSettings(updated);
      setSettings(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const addBinding = async () => {
    const bundleId = newBundleId.trim();
    const profileId = newProfileId;
    if (!bundleId || !profileId || !settings) return;
    await saveBindings({ ...settings.dictationAppProfiles, [bundleId]: profileId });
    setNewBundleId("");
    setNewProfileId("");
  };

  const removeBinding = async (bundleId: string) => {
    if (!settings) return;
    const next = { ...settings.dictationAppProfiles };
    delete next[bundleId];
    await saveBindings(next);
  };

  const bindingEntries = settings ? Object.entries(settings.dictationAppProfiles) : [];

  return (
    <PageRoot>
      <RowActions>
        <PageTitle>{t("profiles.title")}</PageTitle>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
          {t("profiles.addNew")}
        </Button>
      </RowActions>

      {profiles.length === 0 ? (
        <EmptyState title={t("common.empty")} />
      ) : (
        <Card>
          {profiles.map((profile) => (
            <Row key={profile.id}>
              <div>
                <RowName>{profile.name}</RowName>
                <RowDescription>
                  {profile.cleanupLevel} · {t("profiles.fields.exportFolder")}: {profile.exportFolder}
                </RowDescription>
              </div>
              <Row.Badges>
                {profile.isDefault && <Badge tone="accent">{t("profiles.defaultBadge")}</Badge>}
                {profile.isBuiltIn && <Badge tone="neutral">{t("profiles.builtInBadge")}</Badge>}
                <Button variant="ghost" leftIcon={<Pencil size={14} />} onClick={() => openEdit(profile)}>
                  {t("common.edit")}
                </Button>
                <Button variant="ghost" leftIcon={<Copy size={14} />} onClick={() => void handleDuplicate(profile)}>
                  {t("profiles.duplicate")}
                </Button>
                {!profile.isBuiltIn && (
                  <Button variant="ghost" leftIcon={<Trash2 size={14} />} onClick={() => void handleDelete(profile)}>
                    {t("common.delete")}
                  </Button>
                )}
              </Row.Badges>
            </Row>
          ))}
        </Card>
      )}

      <AppBindingsCard>
        <AppBindingsHeader>{t("profiles.bindings.title")}</AppBindingsHeader>
        <AppBindingsHint>{t("profiles.bindings.hint")}</AppBindingsHint>
        {bindingEntries.map(([bundleId, profileId]) => (
          <AppBindingRow key={bundleId}>
            <code>{bundleId}</code>
            <BindingSelect
              value={profileId}
              onChange={(e) => void saveBindings({ ...settings!.dictationAppProfiles, [bundleId]: e.target.value })}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {!profiles.some((p) => p.id === profileId) && (
                <option value={profileId}>{profileLabel(profileId)}</option>
              )}
            </BindingSelect>
            <Button variant="ghost" size="sm" leftIcon={<X size={14} />} onClick={() => void removeBinding(bundleId)}>
              {t("common.remove")}
            </Button>
          </AppBindingRow>
        ))}
        <AppBindingRow>
          <Input
            value={newBundleId}
            placeholder={t("profiles.bindings.bundlePlaceholder")}
            onChange={(e) => setNewBundleId(e.target.value)}
          />
          <BindingSelect value={newProfileId} onChange={(e) => setNewProfileId(e.target.value)}>
            <option value="">{t("profiles.bindings.pickProfile")}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </BindingSelect>
          <Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={() => void addBinding()}>
            {t("common.add")}
          </Button>
        </AppBindingRow>
      </AppBindingsCard>

      <ProfileEditor
        isOpen={editorOpen}
        profile={editing}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </PageRoot>
  );
};

export default Profiles;
