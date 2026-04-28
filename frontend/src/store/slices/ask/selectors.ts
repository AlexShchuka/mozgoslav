import type { GlobalState } from "../../rootReducer";
import type { AskMessage } from "../../../features/Ask/types";

export const selectAskMessages = (state: GlobalState): readonly AskMessage[] => state.ask.messages;

export const selectAskIsAsking = (state: GlobalState): boolean => state.ask.isAsking;

export const selectAskError = (state: GlobalState): string | null => state.ask.error;
