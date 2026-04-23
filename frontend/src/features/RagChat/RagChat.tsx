import {FC, FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {AnimatePresence, motion} from "framer-motion";

import Button from "../../components/Button";
import type {RagCitation, RagMessage} from "../../store/slices/rag/types";
import type {RagChatProps} from "./types";
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
    StatusGroup,
    StatusText,
    Title,
    TypingDots,
    Warning,
} from "./RagChat.style";

const RagChat: FC<RagChatProps> = ({
    messages,
    isAsking,
    status,
    isReindexing,
    onAsk,
    onReindex,
    onCitationNavigate,
}) => {
    const {t} = useTranslation();
    const [draft, setDraft] = useState("");
    const listRef = useRef<HTMLOListElement | null>(null);

    useEffect(() => {
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

    const statusLabel = ((): string => {
        if (status === null) return t("rag.statusUnknown");
        if (status.chunks === 0) return t("rag.statusEmpty");
        return t("rag.statusReady", {chunks: status.chunks, notes: status.notes});
    })();
    const statusIsEmpty = status !== null && status.chunks === 0;

    return (
        <ChatRoot>
            <Header>
                <Title>{t("rag.title")}</Title>
                <StatusGroup>
                    <StatusText data-testid="rag-status" $empty={statusIsEmpty}>
                        {statusLabel}
                    </StatusText>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onReindex}
                        isLoading={isReindexing}
                        disabled={isReindexing}
                        data-testid="rag-reindex"
                    >
                        {t("rag.reindex")}
                    </Button>
                </StatusGroup>
            </Header>

            <MessageList ref={listRef} data-testid="rag-message-list">
                {messages.length === 0 && <EmptyState>{t("rag.emptyState")}</EmptyState>}
                <AnimatePresence initial={false}>
                    {messages.map((message) => (
                        <motion.li
                            key={message.id}
                            layout
                            initial={{opacity: 0, y: 8}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0}}
                            transition={{duration: 0.35, ease: "easeOut"}}
                            style={{listStyle: "none"}}
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
                <span/>
                <span/>
                <span/>
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
