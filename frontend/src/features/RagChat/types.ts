import type {RagCitation, RagMessage} from "../../store/slices/rag/types";

export interface RagChatProps {
    readonly messages: readonly RagMessage[];
    readonly isAsking: boolean;
    readonly onAsk: (question: string) => void;
    readonly onCitationNavigate: (citation: RagCitation) => void;
}
