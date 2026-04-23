import type {RagCitation, RagMessage} from "../../store/slices/rag/types";

export interface RagIndexStatus {
    readonly chunks: number;
    readonly notes: number;
}

export interface RagChatProps {
    readonly messages: readonly RagMessage[];
    readonly isAsking: boolean;
    readonly status: RagIndexStatus | null;
    readonly isReindexing: boolean;
    readonly onAsk: (question: string) => void;
    readonly onReindex: () => void;
    readonly onCitationNavigate: (citation: RagCitation) => void;
}
