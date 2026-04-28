import { FC, useCallback, useEffect, useState } from "react";

import AskOverlay from "./AskOverlay";

const AskOverlayConnected: FC = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const bridge = typeof window !== "undefined" ? window.mozgoslav : undefined;
    if (!bridge) return;

    const unsubAnswer = bridge.onAskCorpusAnswer?.((payload) => {
      setQuestion(payload.question);
      setAnswer(payload.answer);
      setIsLoading(false);
      setError(null);
    });

    const unsubError = bridge.onAskCorpusError?.((payload) => {
      setError(payload.message);
      setIsLoading(false);
    });

    return () => {
      unsubAnswer?.();
      unsubError?.();
    };
  }, []);

  const handleHide = useCallback(() => {
    const bridge = typeof window !== "undefined" ? window.mozgoslav : undefined;
    bridge?.hideAskOverlay?.();
  }, []);

  return (
    <AskOverlay
      question={question}
      answer={answer}
      error={error}
      isLoading={isLoading}
      onHide={handleHide}
    />
  );
};

export default AskOverlayConnected;
