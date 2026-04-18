import { FC, FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AnimatePresence, motion } from "framer-motion";

import Button from "../../components/Button";
import type { RagCitation, RagMessage } from "../../store/slices/rag/types";
import type { RagChatProps } from "./types";
import {
  ChatRoot,
  CitationChip,
  CitationRow,
  EmptyState,
  ErrorRow,
  Header,
  InputBar,
  InputField,
  MessageContent,
  MessageList,
  MessageRow,
  Title,
  TypingDots,
  Warning,
} from "./RagChat.style";

// Single-surface, full-page RAG chat. Place ADR-007-phase2-frontend.md §3.1:
// - Route /rag. Single text input at the bottom; Enter submits, Shift+Enter newlines.
// - Message list stacks top-down. Citations render as chips → navigate to note.
// - No "Ask" button; no bubbles around assistant.
// - Subtle enter animation on new messages; typing dots while pending.
const RagChat: FC<RagChatProps> = ({ messages, isAsking, onAsk, onCitationNavigate }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    // Scroll the conversation view to the latest message whenever the list
    // grows (user question or assistant streamed reply).
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (): void => {
    const question = draft.trim();
    if (!question || isAsking) return;
    setDraft("");
    onAsk(question);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <ChatRoot>
      <Header>
        <Title>{t("rag.title")}</Title>
      </Header>

      <MessageList ref={listRef} data-testid="rag-message-list">
        {messages.length === 0 && <EmptyState>{t("rag.emptyState")}</EmptyState>}
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.li
              key={message.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{ listStyle: "none" }}
            >
              <MessageRow $role={message.role}>
                <MessageContent $role={message.role}>
                  {renderMessageBody(message, t, onCitationNavigate)}
                </MessageContent>
              </MessageRow>
            </motion.li>
          ))}
        </AnimatePresence>
      </MessageList>

      <InputBar onSubmit={handleSubmit} aria-label="rag-input">
        <InputField
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("rag.placeholder")}
          rows={1}
          disabled={isAsking}
          data-testid="rag-input"
        />
        <Button
          type="submit"
          variant="primary"
          isLoading={isAsking}
          disabled={!draft.trim() || isAsking}
        >
          {t("common.next")}
        </Button>
      </InputBar>
    </ChatRoot>
  );
};

const renderMessageBody = (
  message: RagMessage,
  t: TFunction,
  onCitationNavigate: (citation: RagCitation) => void,
): ReactNode => {
  if (message.state === "pending") {
    return (
      <TypingDots aria-label="rag-pending">
        <span />
        <span />
        <span />
      </TypingDots>
    );
  }

  if (message.state === "error") {
    return <ErrorRow>{t("rag.error")}: {message.content}</ErrorRow>;
  }

  return (
    <>
      {message.role === "assistant" && !message.llmAvailable && (
        <Warning>{t("rag.llmUnavailable")}</Warning>
      )}
      <div>{message.content}</div>
      {message.citations.length > 0 && (
        <CitationRow>
          {message.citations.map((citation, index) => (
            <CitationChip
              key={citation.chunkId}
              type="button"
              onClick={() => onCitationNavigate(citation)}
              data-testid="rag-citation"
              title={citation.text}
            >
              [§{index + 1}] {t("rag.citationLink")}
            </CitationChip>
          ))}
        </CitationRow>
      )}
    </>
  );
};

export default RagChat;
