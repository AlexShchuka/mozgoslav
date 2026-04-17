import { FC, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain } from "lucide-react";

import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import Badge from "../../components/Badge";
import { api } from "../../api/MozgoslavApi";
import { ProcessedNote } from "../../domain/ProcessedNote";
import { noteRoute } from "../../constants/routes";
import { PageRoot, PageTitle, NoteRow, NoteTopic, NoteMeta } from "./NotesList.style";

const NotesList: FC = () => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<ProcessedNote[]>([]);

  useEffect(() => {
    void api.listNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

  return (
    <PageRoot>
      <PageTitle>{t("nav.notes")}</PageTitle>
      {notes.length === 0 ? (
        <EmptyState title={t("common.empty")} icon={<Brain size={28} />} />
      ) : (
        <Card>
          {notes.map((note) => (
            <NoteRow key={note.id}>
              <NoteTopic as={Link} to={noteRoute(note.id)}>
                {note.topic || "conversation"}
              </NoteTopic>
              <NoteMeta>
                v{note.version} · {new Date(note.createdAt).toLocaleDateString()}
              </NoteMeta>
              {note.exportedToVault && <Badge tone="success">vault</Badge>}
            </NoteRow>
          ))}
        </Card>
      )}
    </PageRoot>
  );
};

export default NotesList;
