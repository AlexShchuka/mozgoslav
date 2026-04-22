import {FC, useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import {toast} from "react-toastify";
import {ArrowLeft, Copy, FolderOutput, RefreshCw} from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import {apiFactory} from "../../api";
import {ProcessedNote} from "../../domain/ProcessedNote";
import {ROUTES} from "../../constants/routes";
import {Actions, BackBar, MarkdownBody, Meta, PageRoot, PageTitle} from "./NoteViewer.style";

const notesApi = apiFactory.createNotesApi();

const NoteViewer: FC = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {id = ""} = useParams();
    const [note, setNote] = useState<ProcessedNote | null>(null);

    useEffect(() => {
        if (!id) return;
        void notesApi.getById(id).then(setNote).catch(() => setNote(null));
    }, [id]);

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

    const onExport = async () => {
        if (!note) return;
        try {
            const updated = await notesApi.exportNote(note.id);
            setNote(updated);
            toast.success(t("common.apply"));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        }
    };

    if (!note) return <PageRoot>{t("common.loading")}</PageRoot>;

    return (
        <PageRoot>
            <BackBar>
                <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft size={16}/>}
                    data-testid="note-back"
                    onClick={onBack}
                >
                    {t("notes.back")}
                </Button>
            </BackBar>
            <PageTitle>{note.topic || t("note.title")}</PageTitle>
            <Meta>
                <Badge tone="accent">v{note.version}</Badge>
                <Badge tone="neutral">{note.conversationType}</Badge>
                {note.exportedToVault && <Badge tone="success">vault</Badge>}
                <span>{new Date(note.createdAt).toLocaleString()}</span>
            </Meta>
            <Actions>
                <Button variant="secondary" leftIcon={<Copy size={16}/>} onClick={onCopy}>
                    {t("note.actions.copyMarkdown")}
                </Button>
                <Button variant="primary" leftIcon={<FolderOutput size={16}/>} onClick={onExport}>
                    {t("note.actions.export")}
                </Button>
                <Button variant="ghost" leftIcon={<RefreshCw size={16}/>} disabled>
                    {t("note.actions.reprocess")}
                </Button>
            </Actions>
            <Card>
                <MarkdownBody>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, [remarkFrontmatter, ["yaml"]]]}
                    >
                        {note.markdownContent || "*empty*"}
                    </ReactMarkdown>
                </MarkdownBody>
            </Card>
        </PageRoot>
    );
};

export default NoteViewer;
