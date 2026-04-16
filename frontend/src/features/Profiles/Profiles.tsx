import { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Pencil, Plus } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import { api } from "../../api/MozgoslavApi";
import { Profile } from "../../models/Profile";
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
