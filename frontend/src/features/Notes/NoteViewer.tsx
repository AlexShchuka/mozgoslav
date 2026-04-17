import { FC, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "react-toastify";
import { Copy, FolderOutput, RefreshCw } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import { api } from "../../api/MozgoslavApi";
import { ProcessedNote } from "../../types/ProcessedNote";
import { PageRoot, PageTitle, Actions, Meta, MarkdownBody } from "./NoteViewer.style";

const NoteViewer: FC = () => {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const [note, setNote] = useState<ProcessedNote | null>(null);

  useEffect(() => {
    if (!id) return;
    void api.getNote(id).then(setNote).catch(() => setNote(null));
  }, [id]);

  const onCopy = async () => {
    if (!note) return;
    await navigator.clipboard.writeText(note.markdownContent);
    toast.success(t("common.copied"));
  };

  const onExport = async () => {
    if (!note) return;
    try {
      const updated = await api.exportNote(note.id);
      setNote(updated);
      toast.success(t("common.apply"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (!note) return <PageRoot>{t("common.loading")}</PageRoot>;

  return (
    <PageRoot>
      <PageTitle>{note.topic || t("note.title")}</PageTitle>
      <Meta>
        <Badge tone="accent">v{note.version}</Badge>
        <Badge tone="neutral">{note.conversationType}</Badge>
        {note.exportedToVault && <Badge tone="success">vault</Badge>}
        <span>{new Date(note.createdAt).toLocaleString()}</span>
      </Meta>
      <Actions>
        <Button variant="secondary" leftIcon={<Copy size={16} />} onClick={onCopy}>
          {t("note.actions.copyMarkdown")}
        </Button>
        <Button variant="primary" leftIcon={<FolderOutput size={16} />} onClick={onExport}>
          {t("note.actions.export")}
        </Button>
        <Button variant="ghost" leftIcon={<RefreshCw size={16} />} disabled>
          {t("note.actions.reprocess")}
        </Button>
      </Actions>
      <Card>
        <MarkdownBody>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.markdownContent || "*empty*"}</ReactMarkdown>
        </MarkdownBody>
      </Card>
    </PageRoot>
  );
};

export default NoteViewer;
