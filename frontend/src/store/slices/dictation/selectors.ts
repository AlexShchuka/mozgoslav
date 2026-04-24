import type { GlobalState } from "../../rootReducer";
import type { DictationStatus } from "./types";

export const selectDictationStatus = (state: GlobalState): DictationStatus =>
  state.dictation.status;

export const selectDictationPhase = (state: GlobalState): DictationStatus["phase"] =>
  state.dictation.status.phase;
