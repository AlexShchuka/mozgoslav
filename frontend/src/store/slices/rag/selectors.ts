import type { GlobalState } from "../../rootReducer";
import type { RagState } from "./types";

const root = (state: GlobalState): RagState => state.rag;

export const selectRagMessages = (state: GlobalState) => root(state).messages;
export const selectRagIsAsking = (state: GlobalState) => root(state).isAsking;
export const selectRagError = (state: GlobalState) => root(state).error;
export const selectRagStatus = (state: GlobalState) => root(state).status;
export const selectIsLoadingRagStatus = (state: GlobalState) => root(state).isLoadingStatus;
export const selectIsReindexingRag = (state: GlobalState) => root(state).isReindexing;
export const selectLastReindexCount = (state: GlobalState) => root(state).lastReindexCount;
