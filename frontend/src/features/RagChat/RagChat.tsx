import { FC, FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { api } from "../../api/MozgoslavApi";
import Button from "../../components/Button";
import { noteRoute } from "../../constants/routes";
import type { RagAnswer } from "../../domain/Rag";
import {
  Bubble,
  ChatRoot,
  CitationHeader,
  CitationItem,
  CitationList,
  Header,
  History,
  InputRow,
  QuestionArea,
  Title,
  Warning,
} from "./RagChat.style";

interface ChatTurn {
  readonly question: string;
  readonly answer: RagAnswer;
}

const RagChat: FC = () => {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setQuestion("");
    try {
      const answer = await api.ragQuery(q);
      setTurns((prev) => [...prev, { question: q, answer }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setQuestion(q);
    } finally {
      setBusy(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const { indexed } = await api.ragReindex();
      toast.success(t("rag.reindexedToast", { count: indexed }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setReindexing(false);
    }
  };

  return (
    <ChatRoot>
      <Header>
        <Title>{t("rag.title")}</Title>
        <Button variant="secondary" onClick={handleReindex} isLoading={reindexing}>
          {t("rag.reindex")}
        </Button>
      </Header>

      <History>
        {turns.length === 0 && <Bubble $role="assistant">{t("rag.welcome")}</Bubble>}
        {turns.map((turn, index) => (
          <div key={index}>
            <Bubble $role="user">{turn.question}</Bubble>
            <Bubble $role="assistant">
              {!turn.answer.llmAvailable && <Warning>{t("rag.llmUnavailable")}</Warning>}
              {turn.answer.answer}
              {turn.answer.citations.length > 0 && (
                <CitationList>
                  {turn.answer.citations.map((c) => (
                    <CitationItem key={c.chunkId}>
                      <CitationHeader>
                        <Link to={noteRoute(c.noteId)}>{t("rag.openNote")}</Link>
                        <span>{c.score.toFixed(2)}</span>
                      </CitationHeader>
                      {c.text}
                    </CitationItem>
                  ))}
                </CitationList>
              )}
            </Bubble>
          </div>
        ))}
      </History>

      <InputRow onSubmit={handleSubmit}>
        <QuestionArea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("rag.askPlaceholder")}
          disabled={busy}
        />
        <Button type="submit" isLoading={busy} disabled={!question.trim()}>
          {t("rag.ask")}
        </Button>
      </InputRow>
    </ChatRoot>
  );
};

export default RagChat;
