import {FC, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {toast} from "react-toastify";
import {Copy, Pencil, Plus, Trash2} from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import {Profile} from "../../domain/Profile";
import ProfileEditor, {ProfileDraft} from "./ProfileEditor";
import type {ProfileMutation, ProfilesProps} from "./types";
import {PageRoot, PageTitle, Row, RowActions, RowDescription, RowName} from "./Profiles.style";

const toMutation = (draft: ProfileDraft): ProfileMutation => ({
    name: draft.name,
    systemPrompt: draft.systemPrompt,
    transcriptionPromptOverride: draft.transcriptionPromptOverride,
    outputTemplate: "",
    cleanupLevel: draft.cleanupLevel,
    exportFolder: draft.exportFolder,
    autoTags: draft.autoTags,
    isDefault: draft.isDefault,
});

const Profiles: FC<ProfilesProps> = ({
                                         profiles,
                                         error,
                                         onLoad,
                                         onCreate,
                                         onUpdate,
                                         onDelete,
                                         onDuplicate,
                                     }) => {
    const {t} = useTranslation();
    const [editing, setEditing] = useState<Profile | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);

    useEffect(() => {
        onLoad();
    }, [onLoad]);

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    const openCreate = () => {
        setEditing(null);
        setEditorOpen(true);
    };

    const openEdit = (profile: Profile) => {
        setEditing(profile);
        setEditorOpen(true);
    };

    const handleSave = async (draft: ProfileDraft) => {
        const mutation = toMutation(draft);
        if (draft.id) {
            onUpdate(draft.id, mutation);
        } else {
            onCreate(mutation);
        }
    };

    const handleDuplicate = (profile: Profile) => {
        onDuplicate(profile.id);
    };

    const handleDelete = (profile: Profile) => {
        if (profile.isBuiltIn) {
            toast.error(t("profiles.builtInDeleteBlocked"));
            return;
        }
        const confirmed = window.confirm(
            t("profiles.deleteConfirm", {name: profile.name}),
        );
        if (!confirmed) return;
        onDelete(profile.id);
    };

    return (
        <PageRoot>
            <RowActions>
                <PageTitle>{t("profiles.title")}</PageTitle>
                <Button
                    data-testid="profiles-create"
                    variant="primary"
                    leftIcon={<Plus size={16}/>}
                    onClick={openCreate}
                >
                    {t("profiles.addNew")}
                </Button>
            </RowActions>

            {profiles.length === 0 ? (
                <EmptyState title={t("common.empty")}/>
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
                                    leftIcon={<Pencil size={14}/>}
                                    onClick={() => openEdit(profile)}
                                >
                                    {t("common.edit")}
                                </Button>
                                <Button
                                    data-testid={`profile-row-duplicate-${profile.id}`}
                                    variant="ghost"
                                    leftIcon={<Copy size={14}/>}
                                    onClick={() => handleDuplicate(profile)}
                                >
                                    {t("profiles.duplicate")}
                                </Button>
                                <Button
                                    data-testid={`profile-row-delete-${profile.id}`}
                                    variant="ghost"
                                    leftIcon={<Trash2 size={14}/>}
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
