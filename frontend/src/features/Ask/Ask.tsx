import { FC, FormEvent, KeyboardEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../../components/Button";
import type { AskMessage, AskProps } from "./types";
import {
  AskRoot,
  CitationChipCorpus,
  CitationChipWeb,
  CitationGroupTitle,
  CitationGroups,
  EmptyState,
  Header,
  IncludeWebToggle,
  InputBar,
  InputField,
  MessageBubble,
  MessageList,
  MessageRow,
  Title,
  TypingDots,
} from "./Ask.style";

const Ask: FC<AskProps> = ({ messages, isAsking, onAsk }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [includeWeb, setIncludeWeb] = useState(true);
  const listRef = useRef<HTMLOListElement | null>(null);

  const submit = (): void => {
    const question = draft.trim();
    if (!question || isAsking) return;
    setDraft("");
    onAsk(question, includeWeb);
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 50);
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
    <AskRoot>
      <Header>
        <Title>{t("ask.title")}</Title>
      </Header>
      <MessageList ref={listRef} data-testid="ask-message-list">
        {messages.length === 0 && <EmptyState>{t("ask.emptyState")}</EmptyState>}
        {messages.map((message) => (
          <li key={message.id} style={{ listStyle: "none" }}>
            <MessageRow $role={message.role}>
              <MessageBubble $role={message.role}>
                {renderBody(message, t)}
              </MessageBubble>
            </MessageRow>
          </li>
        ))}
      </MessageList>
      <InputBar onSubmit={handleSubmit}>
        <InputField
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("ask.placeholder")}
          rows={2}
          disabled={isAsking}
          data-testid="ask-input"
        />
        <IncludeWebToggle>
          <input
            type="checkbox"
            checked={includeWeb}
            onChange={(e) => setIncludeWeb(e.target.checked)}
          />
          {t("ask.includeWeb")}
        </IncludeWebToggle>
        <Button
          type="submit"
          variant="primary"
          isLoading={isAsking}
          disabled={!draft.trim() || isAsking}
        >
          {t("common.next")}
        </Button>
      </InputBar>
    </AskRoot>
  );
};

const renderBody = (
  message: AskMessage,
  t: ReturnType<typeof useTranslation>["t"]
) => {
  if (message.state === "pending") {
    return (
      <TypingDots aria-label="ask-pending">
        <span />
        <span />
        <span />
      </TypingDots>
    );
  }

  if (message.state === "error") {
    return <span>{message.content}</span>;
  }

  const corpusCitations = message.citations.filter((c) => c.source === "Corpus");
  const webCitations = message.citations.filter((c) => c.source === "Web");

  return (
    <>
      <div>{message.content}</div>
      {(corpusCitations.length > 0 || webCitations.length > 0) && (
        <CitationGroups>
          {corpusCitations.length > 0 && (
            <div>
              <CitationGroupTitle>{t("ask.citationCorpus")}</CitationGroupTitle>
              {corpusCitations.map((c, i) => (
                <CitationChipCorpus key={`corpus-${i}`} type="button" title={c.snippet}>
                  {c.reference}
                </CitationChipCorpus>
              ))}
            </div>
          )}
          {webCitations.length > 0 && (
            <div>
              <CitationGroupTitle>{t("ask.citationWeb")}</CitationGroupTitle>
              {webCitations.map((c, i) => (
                <CitationChipWeb
                  key={`web-${i}`}
                  href={c.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={c.snippet}
                  onClick={(e) => {
                    if (c.url && typeof window !== "undefined" && window.mozgoslav?.openExternal) {
                      e.preventDefault();
                      void window.mozgoslav.openExternal(c.url);
                    }
                  }}
                >
                  {c.reference}
                </CitationChipWeb>
              ))}
            </div>
          )}
        </CitationGroups>
      )}
    </>
  );
};

export default Ask;
