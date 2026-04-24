import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Brain, FolderTree, Plus, Trash2 } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import GroupedList from "../../components/GroupedList";
import Modal from "../../components/Modal";
import { graphqlClient } from "../../api/graphqlClient";
import {
  MutationCreateNoteDocument,
  MutationDeleteNoteDocument,
  QueryNotesDocument,
} from "../../api/gql/graphql";
import { ProcessedNote } from "../../domain/ProcessedNote";
import { noteRoute } from "../../constants/routes";
import { notifyError, notifySuccess } from "../../store/slices/notifications";
import { applyLayout, selectObsidianIsApplyingLayout } from "../../store/slices/obsidian";
import { loadSettings, selectSettings } from "../../store/slices/settings";
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
  const isApplyingLayout = useSelector(selectObsidianIsApplyingLayout);
  const prevApplyingRef = useRef(false);

  const [notes, setNotes] = useState<ProcessedNote[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadNotes = useCallback(() => {
    void graphqlClient
      .request(QueryNotesDocument, { first: 200 })
      .then((data) => setNotes((data.notes?.nodes ?? []) as unknown as ProcessedNote[]))
      .catch(() => setNotes([]));
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (!settings) dispatch(loadSettings());
  }, [dispatch, settings]);

  useEffect(() => {
    if (prevApplyingRef.current && !isApplyingLayout) {
      loadNotes();
    }
    prevApplyingRef.current = isApplyingLayout;
  }, [isApplyingLayout, loadNotes]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [notes]
  );

  const vaultRoot = settings?.vaultPath ?? "";
  const organizeDisabled = !vaultRoot || isApplyingLayout;

  const openAdd = () => {
    setIsAdding(true);
    setTitle("");
    setBody("");
  };
  const closeAdd = () => setIsAdding(false);

  const openNote = (note: ProcessedNote) => navigate(noteRoute(note.id));

  const handleDelete = async (note: ProcessedNote) => {
    const confirmed = window.confirm(
      t("notes.deleteConfirm", { title: note.topic || "conversation" })
    );
    if (!confirmed) return;
    try {
      await graphqlClient.request(MutationDeleteNoteDocument, { id: note.id });
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      dispatch(notifySuccess({ messageKey: "notes.deleted" }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dispatch(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message },
        })
      );
    }
  };

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSubmitting(true);
    try {
      const data = await graphqlClient.request(MutationCreateNoteDocument, {
        input: { title: trimmedTitle, body },
      });
      const created = data.createNote.note;
      if (created) {
        setNotes((prev) => [created as unknown as ProcessedNote, ...prev]);
      }
      dispatch(notifySuccess({ messageKey: "notes.created" }));
      closeAdd();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dispatch(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message },
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const organize = () => {
    if (organizeDisabled) return;
    dispatch(applyLayout());
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
      onClick={() => void handleDelete(note)}
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
            variant="secondary"
            leftIcon={<FolderTree size={16} />}
            data-testid="notes-organize"
            isLoading={isApplyingLayout}
            disabled={organizeDisabled}
            title={!vaultRoot ? t("notes.organizeHint") : undefined}
            onClick={organize}
          >
            {t("notes.organize")}
          </Button>
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
