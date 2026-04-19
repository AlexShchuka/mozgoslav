import {FC, useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {toast} from "react-toastify";
import {Brain, Plus, Trash2} from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import {apiFactory} from "../../api";
import {ProcessedNote} from "../../domain/ProcessedNote";
import {noteRoute} from "../../constants/routes";
import {
    AddToolbar,
    BodyField,
    FieldLabel,
    NoteMeta,
    NoteRow,
    NoteTopic,
    PageRoot,
    PageTitle,
    TitleField,
} from "./NotesList.style";

const notesApi = apiFactory.createNotesApi();

const NotesList: FC = () => {
    const {t} = useTranslation();
    const [notes, setNotes] = useState<ProcessedNote[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        void notesApi
            .list()
            .then(setNotes)
            .catch(() => setNotes([]));
    }, []);

    const openAdd = () => {
        setIsAdding(true);
        setTitle("");
        setBody("");
    };
    const closeAdd = () => setIsAdding(false);

    const sortedNotes = useMemo(
        () => [...notes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
        [notes],
    );

    const handleDelete = async (note: ProcessedNote) => {
        const confirmed = window.confirm(
            t("notes.deleteConfirm", {title: note.title || note.topic || ""}),
        );
        if (!confirmed) return;
        try {
            await notesApi.remove(note.id);
            setNotes((prev) => prev.filter((n) => n.id !== note.id));
            toast.success(t("notes.deleted"));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        }
    };

    const submit = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;
        setSubmitting(true);
        try {
            const created = await notesApi.create({title: trimmedTitle, body});
            setNotes((prev) => [created, ...prev]);
            toast.success(t("notes.created"));
            closeAdd();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageRoot>
            <AddToolbar>
                <PageTitle>{t("nav.notes")}</PageTitle>
                <Button
                    variant="primary"
                    leftIcon={<Plus size={16}/>}
                    data-testid="notes-add-button"
                    onClick={openAdd}
                >
                    {t("notes.add")}
                </Button>
            </AddToolbar>
            {sortedNotes.length === 0 ? (
                <EmptyState title={t("common.empty")} icon={<Brain size={28}/>}/>
            ) : (
                <Card>
                    {sortedNotes.map((note) => (
                        <NoteRow key={note.id}>
                            <NoteTopic as={Link} to={noteRoute(note.id)}>
                                {note.topic || "conversation"}
                            </NoteTopic>
                            <NoteMeta>
                                v{note.version} · {new Date(note.createdAt).toLocaleDateString()}
                            </NoteMeta>
                            {note.exportedToVault && <Badge tone="success">vault</Badge>}
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Trash2 size={14}/>}
                                data-testid={`notes-delete-${note.id}`}
                                onClick={() => void handleDelete(note)}
                            >
                                {t("common.delete")}
                            </Button>
                        </NoteRow>
                    ))}
                </Card>
            )}

            <Modal
                isOpen={isAdding}
                onClose={closeAdd}
                title={t("notes.addTitle")}
                footer={
                    <>
                        <Button variant="ghost" onClick={closeAdd}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            variant="primary"
                            data-testid="notes-add-submit"
                            isLoading={submitting}
                            disabled={submitting || !title.trim()}
                            onClick={() => void submit()}
                        >
                            {t("notes.submit")}
                        </Button>
                    </>
                }
            >
                <FieldLabel htmlFor="notes-add-title">{t("notes.titleLabel")}</FieldLabel>
                <TitleField
                    id="notes-add-title"
                    data-testid="notes-add-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    autoFocus
                />
                <FieldLabel htmlFor="notes-add-body">{t("notes.bodyLabel")}</FieldLabel>
                <BodyField
                    id="notes-add-body"
                    data-testid="notes-add-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={12}
                />
            </Modal>
        </PageRoot>
    );
};

export default NotesList;
