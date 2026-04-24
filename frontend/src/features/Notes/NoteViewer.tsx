import { FC, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "react-toastify";
import { ArrowLeft, Copy, FolderOutput, RefreshCw } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import { ROUTES } from "../../constants/routes";
import { stripFrontmatter } from "./markdown";
import {
  exportNote as exportNoteAction,
  loadNote,
  selectExportingNoteIds,
  selectNoteById,
} from "../../store/slices/notes";
import {
  Actions,
  BackBar,
  ChipRow,
  ChipRowLabel,
  MarkdownBody,
  Meta,
  MetaTime,
  PageRoot,
  PageTitle,
  SummaryLead,
} from "./NoteViewer.style";

const NoteViewer: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches project-wide useDispatch cast (Layout.tsx, Sync.tsx)
  const dispatch = useDispatch() as (action: any) => void;

  useEffect(() => {
    if (id) dispatch(loadNote(id));
  }, [id, dispatch]);

  const note = useSelector(selectNoteById(id));
  const exportingIds = useSelector(selectExportingNoteIds);
  const isExporting = exportingIds[id] === true;

  const body = useMemo(() => (note ? stripFrontmatter(note.markdownContent) : ""), [note]);

  const onBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(ROUTES.notes);
    }
  };

  const onCopy = async () => {
    if (!note) return;
    await navigator.clipboard.writeText(note.markdownContent);
    toast.success(t("common.copied"));
  };

  const onExport = () => {
    if (!note) return;
    dispatch(exportNoteAction(note.id));
  };

  if (!note) return <PageRoot>{t("common.loading")}</PageRoot>;

  const title = note.summary || note.topic || t("note.title");

  return (
    <PageRoot>
      <BackBar>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
          data-testid="note-back"
          onClick={onBack}
        >
          {t("notes.back")}
        </Button>
      </BackBar>
      <PageTitle>{title}</PageTitle>
      <Meta>
        <MetaTime>{new Date(note.createdAt).toLocaleString()}</MetaTime>
        <Badge tone="accent">v{note.version}</Badge>
        <Badge tone="neutral">{note.conversationType}</Badge>
        {note.exportedToVault && <Badge tone="success">vault</Badge>}
      </Meta>
      {note.participants.length > 0 && (
        <ChipRow data-testid="note-participants">
          <ChipRowLabel>{t("note.participants")}</ChipRowLabel>
          {note.participants.map((p) => (
            <Badge key={p} tone="neutral">
              {p}
            </Badge>
          ))}
        </ChipRow>
      )}
      {note.tags.length > 0 && (
        <ChipRow data-testid="note-tags">
          <ChipRowLabel>{t("note.tags")}</ChipRowLabel>
          {note.tags.map((tag) => (
            <Badge key={tag} tone="accent">
              {tag}
            </Badge>
          ))}
        </ChipRow>
      )}
      {note.summary && note.topic && note.summary !== note.topic && (
        <SummaryLead data-testid="note-summary-lead">{note.summary}</SummaryLead>
      )}
      <Actions>
        <Button variant="secondary" leftIcon={<Copy size={16} />} onClick={onCopy}>
          {t("note.actions.copyMarkdown")}
        </Button>
        <Button
          variant="primary"
          leftIcon={<FolderOutput size={16} />}
          isLoading={isExporting}
          disabled={isExporting}
          onClick={onExport}
        >
          {t("note.actions.export")}
        </Button>
        <Button variant="ghost" leftIcon={<RefreshCw size={16} />} disabled>
          {t("note.actions.reprocess")}
        </Button>
      </Actions>
      <Card>
        <MarkdownBody>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || "*empty*"}</ReactMarkdown>
        </MarkdownBody>
      </Card>
    </PageRoot>
  );
};

export default NoteViewer;
