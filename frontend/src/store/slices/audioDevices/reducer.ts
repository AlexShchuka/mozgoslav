import type { Reducer } from "redux";
import { AUDIO_DEVICE_CHANGED, type AudioDevicesAction } from "./actions";
import { initialAudioDevicesState, type AudioDevicesState } from "./types";

export const audioDevicesReducer: Reducer<AudioDevicesState> = (
  state: AudioDevicesState = initialAudioDevicesState,
  action
): AudioDevicesState => {
  const typed = action as AudioDevicesAction;
  switch (typed.type) {
    case AUDIO_DEVICE_CHANGED:
      return { ...state, lastChange: typed.payload.event };
    default:
      return state;
  }
};
