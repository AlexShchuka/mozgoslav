import type {RagAnswer, RagCitation} from "../../../domain/Rag";

export type RagMessageRole = "user" | "assistant";
export type RagMessageState = "pending" | "done" | "error";

export interface RagMessage {
    readonly id: string;
    readonly role: RagMessageRole;
    readonly content: string;
    readonly citations: readonly RagCitation[];
    readonly state: RagMessageState;
    readonly llmAvailable: boolean;
}

export interface RagState {
    readonly messages: readonly RagMessage[];
    readonly isAsking: boolean;
    readonly error: string | null;
}

export const initialRagState: RagState = {
    messages: [],
    isAsking: false,
    error: null,
};

export type {RagAnswer, RagCitation};
