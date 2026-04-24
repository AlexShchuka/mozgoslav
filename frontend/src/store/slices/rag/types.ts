import type { RagAnswer, RagCitation } from "../../../domain/Rag";

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

export interface RagStatus {
  readonly embeddedNotes: number;
  readonly chunks: number;
}

export interface RagState {
  readonly messages: readonly RagMessage[];
  readonly isAsking: boolean;
  readonly error: string | null;
  readonly status: RagStatus | null;
  readonly isLoadingStatus: boolean;
  readonly isReindexing: boolean;
  readonly lastReindexCount: number | null;
}

export const initialRagState: RagState = {
  messages: [],
  isAsking: false,
  error: null,
  status: null,
  isLoadingStatus: false,
  isReindexing: false,
  lastReindexCount: null,
};

export type { RagAnswer, RagCitation };
