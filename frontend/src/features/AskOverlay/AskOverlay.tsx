import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { AskOverlayProps } from "./types";
import {
  AskOverlayRoot,
  AnswerText,
  CloseButton,
  ErrorText,
  LoadingSpinner,
  OverlayBody,
  OverlayHeader,
  OverlayTitle,
  QuestionText,
} from "./AskOverlay.style";

const AskOverlay: FC<AskOverlayProps> = ({ question, answer, error, isLoading, onHide }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onHide();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onHide]);

  return (
    <AskOverlayRoot>
      <OverlayHeader>
        <OverlayTitle>{t("ask.overlayTitle")}</OverlayTitle>
        <CloseButton type="button" onClick={onHide} aria-label={t("common.close")}>
          ×
        </CloseButton>
      </OverlayHeader>
      <OverlayBody>
        {question && <QuestionText>{question}</QuestionText>}
        {isLoading && (
          <LoadingSpinner aria-label="ask-overlay-loading">
            <span />
            <span />
            <span />
          </LoadingSpinner>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        {!isLoading && !error && answer && <AnswerText>{answer}</AnswerText>}
        {!isLoading && !error && !answer && !question && (
          <AnswerText>{t("ask.overlayEmpty")}</AnswerText>
        )}
      </OverlayBody>
    </AskOverlayRoot>
  );
};

export default AskOverlay;
