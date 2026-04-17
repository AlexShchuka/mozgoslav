import { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import { api } from "../../api/MozgoslavApi";
import { Profile } from "../../domain/Profile";
import ProfileEditor, { ProfileDraft } from "./ProfileEditor";
import { PageRoot, PageTitle, Row, RowActions, RowDescription, RowName } from "./Profiles.style";

const Profiles: FC = () => {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setProfiles(await api.listProfiles());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (profile: Profile) => {
    setEditing(profile);
    setEditorOpen(true);
  };

  const handleSave = async (draft: ProfileDraft) => {
    try {
      if (draft.id) {
        await api.updateProfile(draft.id, {
          name: draft.name,
          systemPrompt: draft.systemPrompt,
          transcriptionPromptOverride: draft.transcriptionPromptOverride,
          outputTemplate: "",
          cleanupLevel: draft.cleanupLevel,
          exportFolder: draft.exportFolder,
          autoTags: draft.autoTags,
          isDefault: draft.isDefault,
        });
      } else {
        await api.createProfile({
          name: draft.name,
          systemPrompt: draft.systemPrompt,
          transcriptionPromptOverride: draft.transcriptionPromptOverride,
          outputTemplate: "",
          cleanupLevel: draft.cleanupLevel,
          exportFolder: draft.exportFolder,
          autoTags: draft.autoTags,
          isDefault: draft.isDefault,
        });
      }
      toast.success(t("settings.savedToast"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Row action handlers. Built-in profiles are protected server-side;
  // the UI disables the delete button but still keeps a defensive catch for
  // the 409 path (e.g. if a profile flips from user-created to built-in in a
  // race condition).
  const handleDuplicate = async (profile: Profile) => {
    try {
      await api.duplicateProfile(profile.id);
      toast.success(t("profiles.duplicated"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (profile: Profile) => {
    if (profile.isBuiltIn) {
      toast.error(t("profiles.builtInDeleteBlocked"));
      return;
    }
    const confirmed = window.confirm(
      t("profiles.deleteConfirm", { name: profile.name }),
    );
    if (!confirmed) return;
    try {
      await api.deleteProfile(profile.id);
      toast.success(t("profiles.deleted"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <PageRoot>
      <RowActions>
        <PageTitle>{t("profiles.title")}</PageTitle>
        <Button
          data-testid="profiles-create"
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={openCreate}
        >
          {t("profiles.addNew")}
        </Button>
      </RowActions>

      {profiles.length === 0 ? (
        <EmptyState title={t("common.empty")} />
      ) : (
        <Card>
          {profiles.map((profile) => (
            <Row
              key={profile.id}
              data-testid={`profile-row-${profile.id}`}
              data-builtin={profile.isBuiltIn ? "true" : "false"}
            >
              <div>
                <RowName>{profile.name}</RowName>
                <RowDescription>
                  {profile.cleanupLevel} · {t("profiles.fields.exportFolder")}: {profile.exportFolder}
                </RowDescription>
              </div>
              <Row.Badges>
                {profile.isDefault && <Badge tone="accent">{t("profiles.defaultBadge")}</Badge>}
                {profile.isBuiltIn && <Badge tone="neutral">{t("profiles.builtInBadge")}</Badge>}
                <Button
                  data-testid={`profile-row-edit-${profile.id}`}
                  variant="ghost"
                  leftIcon={<Pencil size={14} />}
                  onClick={() => openEdit(profile)}
                >
                  {t("common.edit")}
                </Button>
                <Button
                  data-testid={`profile-row-duplicate-${profile.id}`}
                  variant="ghost"
                  leftIcon={<Copy size={14} />}
                  onClick={() => handleDuplicate(profile)}
                >
                  {t("profiles.duplicate")}
                </Button>
                <Button
                  data-testid={`profile-row-delete-${profile.id}`}
                  variant="ghost"
                  leftIcon={<Trash2 size={14} />}
                  disabled={profile.isBuiltIn}
                  onClick={() => handleDelete(profile)}
                >
                  {t("common.delete")}
                </Button>
              </Row.Badges>
            </Row>
          ))}
        </Card>
      )}

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
