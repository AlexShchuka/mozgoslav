import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Brain, Plus, Trash2 } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import GroupedList from "../../components/GroupedList";
import Modal from "../../components/Modal";
import { ProcessedNote } from "../../domain/ProcessedNote";
import { noteRoute } from "../../constants/routes";
import { loadSettings, selectSettings } from "../../store/slices/settings";
import {
  createNote as createNoteAction,
  deleteNote as deleteNoteAction,
  loadNotes,
  selectAllNotes,
  selectIsSubmittingNote,
} from "../../store/slices/notes";
import { folderFromVaultPath } from "./folder";
import {
  BodyField,
  FieldLabel,
  MetaLine,
  PageRoot,
  PageTitle,
  TitleField,
  Toolbar,
  ToolbarActions,
} from "./NotesList.style";

const NotesList: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches project-wide useDispatch cast (Layout.tsx, Sync.tsx)
  const dispatch = useDispatch() as (action: any) => void;
  const settings = useSelector(selectSettings);
  const notesFromStore = useSelector(selectAllNotes);
  const isSubmitting = useSelector(selectIsSubmittingNote);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const dispatchLoadNotes = useCallback(() => {
    dispatch(loadNotes());
  }, [dispatch]);

  useEffect(() => {
    dispatchLoadNotes();
  }, [dispatchLoadNotes]);

  useEffect(() => {
    if (!settings) dispatch(loadSettings());
  }, [dispatch, settings]);

  const sortedNotes = useMemo(
    () => [...notesFromStore].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [notesFromStore]
  );

  const vaultRoot = settings?.vaultPath ?? "";

  const openAdd = () => {
    setIsAdding(true);
    setTitle("");
    setBody("");
  };
  const closeAdd = () => setIsAdding(false);

  const openNote = (note: ProcessedNote) => navigate(noteRoute(note.id));

  const handleDelete = (note: ProcessedNote) => {
    const confirmed = window.confirm(
      t("notes.deleteConfirm", { title: note.topic || "conversation" })
    );
    if (!confirmed) return;
    dispatch(deleteNoteAction(note.id));
  };

  const submit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    dispatch(createNoteAction({ title: trimmedTitle, body }));
    closeAdd();
  };

  const renderPrimary = (note: ProcessedNote) => {
    const when = new Date(note.createdAt).toLocaleString();
    const label = note.summary || note.topic || "conversation";
    return (
      <>
        <MetaLine>{when}</MetaLine>
        {" · "}
        {label}
      </>
    );
  };

  const renderSecondary = (note: ProcessedNote) => (
    <>
      <MetaLine>v{note.version}</MetaLine>
      {note.tags.length > 0 && (
        <>
          {" · "}
          {note.tags.map((tag, idx) => (
            <span key={tag}>
              {idx > 0 && ", "}#{tag}
            </span>
          ))}
        </>
      )}
      {note.exportedToVault && (
        <>
          {" · "}
          <Badge tone="success">vault</Badge>
        </>
      )}
    </>
  );

  const renderActions = (note: ProcessedNote) => (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={<Trash2 size={14} />}
      data-testid={`notes-delete-${note.id}`}
      onClick={() => handleDelete(note)}
    >
      {t("common.delete")}
    </Button>
  );

  return (
    <PageRoot>
      <Toolbar>
        <PageTitle>{t("nav.notes")}</PageTitle>
        <ToolbarActions>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            data-testid="notes-add-button"
            onClick={openAdd}
          >
            {t("notes.add")}
          </Button>
        </ToolbarActions>
      </Toolbar>

      {sortedNotes.length === 0 ? (
        <EmptyState title={t("common.empty")} icon={<Brain size={28} />} />
      ) : (
        <GroupedList
          items={sortedNotes}
          getId={(n) => n.id}
          getGroupPath={(n) => folderFromVaultPath(n.vaultPath, vaultRoot)}
          renderPrimary={renderPrimary}
          renderSecondary={renderSecondary}
          renderActions={renderActions}
          onItemClick={openNote}
          ungroupedLabel={t("notes.ungrouped")}
          data-testid="notes-list"
        />
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
              isLoading={isSubmitting}
              disabled={isSubmitting || !title.trim()}
              onClick={submit}
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
