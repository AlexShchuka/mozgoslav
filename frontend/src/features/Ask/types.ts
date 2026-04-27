export interface UnifiedCitation {
  source: "Corpus" | "Vault" | "Web";
  reference: string;
  snippet: string;
  url: string | null;
}

export interface AskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: UnifiedCitation[];
  state: "pending" | "done" | "error";
}

export interface AskProps {
  messages: readonly AskMessage[];
  isAsking: boolean;
  onAsk: (question: string, includeWeb: boolean) => void;
}
