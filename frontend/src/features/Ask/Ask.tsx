import { FC, FormEvent, KeyboardEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Button from "../../components/Button";
import { noteRoute } from "../../constants/routes";
import type { AskMessage, AskProps } from "./types";
import {
  AskRoot,
  CitationChipCorpus,
  CitationChipVault,
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
  MessageListItem,
  MessageRow,
  Title,
  TypingDots,
} from "./Ask.style";

const Ask: FC<AskProps> = ({ messages, isAsking, onAsk }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
          <MessageListItem key={message.id}>
            <MessageRow $role={message.role}>
              <MessageBubble $role={message.role}>{renderBody(message, t, navigate)}</MessageBubble>
            </MessageRow>
          </MessageListItem>
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

type NavigateFn = ReturnType<typeof useNavigate>;

const renderBody = (
  message: AskMessage,
  t: ReturnType<typeof useTranslation>["t"],
  navigate: NavigateFn
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
  const vaultCitations = message.citations.filter((c) => c.source === "Vault");
  const webCitations = message.citations.filter((c) => c.source === "Web");

  return (
    <>
      <div>{message.content}</div>
      {(corpusCitations.length > 0 || vaultCitations.length > 0 || webCitations.length > 0) && (
        <CitationGroups>
          {corpusCitations.length > 0 && (
            <div>
              <CitationGroupTitle>{t("ask.citationCorpus")}</CitationGroupTitle>
              {corpusCitations.map((c, i) => (
                <CitationChipCorpus
                  key={`corpus-${i}`}
                  type="button"
                  title={c.snippet}
                  onClick={() => navigate(noteRoute(c.reference))}
                >
                  {c.reference}
                </CitationChipCorpus>
              ))}
            </div>
          )}
          {vaultCitations.length > 0 && (
            <div>
              <CitationGroupTitle>{t("ask.citationVault")}</CitationGroupTitle>
              {vaultCitations.map((c, i) => (
                <CitationChipVault
                  key={`vault-${i}`}
                  type="button"
                  title={c.snippet}
                  onClick={() => {
                    if (typeof window !== "undefined" && window.mozgoslav?.openExternal && c.url) {
                      void window.mozgoslav.openExternal(c.url);
                    }
                  }}
                >
                  {c.reference}
                </CitationChipVault>
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
