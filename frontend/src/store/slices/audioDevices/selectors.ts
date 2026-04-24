import type { GlobalState } from "../../rootReducer";
import type { AudioDeviceChangeEvent } from "./types";

export const selectLastAudioDeviceChange = (state: GlobalState): AudioDeviceChangeEvent | null =>
  state.audioDevices.lastChange;
