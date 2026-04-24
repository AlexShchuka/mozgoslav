import type { AudioDeviceChangeEvent } from "./types";

export const SUBSCRIBE_AUDIO_DEVICES = "audioDevices/SUBSCRIBE";
export const UNSUBSCRIBE_AUDIO_DEVICES = "audioDevices/UNSUBSCRIBE";
export const AUDIO_DEVICE_CHANGED = "audioDevices/CHANGED";
export const AUDIO_DEVICES_STREAM_OPENED = "audioDevices/STREAM_OPENED";
export const AUDIO_DEVICES_STREAM_CLOSED = "audioDevices/STREAM_CLOSED";

export interface SubscribeAudioDevicesAction {
  type: typeof SUBSCRIBE_AUDIO_DEVICES;
}

export interface UnsubscribeAudioDevicesAction {
  type: typeof UNSUBSCRIBE_AUDIO_DEVICES;
}

export interface AudioDeviceChangedAction {
  type: typeof AUDIO_DEVICE_CHANGED;
  payload: { event: AudioDeviceChangeEvent };
}

export interface AudioDevicesStreamOpenedAction {
  type: typeof AUDIO_DEVICES_STREAM_OPENED;
}

export interface AudioDevicesStreamClosedAction {
  type: typeof AUDIO_DEVICES_STREAM_CLOSED;
}

export type AudioDevicesAction =
  | SubscribeAudioDevicesAction
  | UnsubscribeAudioDevicesAction
  | AudioDeviceChangedAction
  | AudioDevicesStreamOpenedAction
  | AudioDevicesStreamClosedAction;

export const subscribeAudioDevices = (): SubscribeAudioDevicesAction => ({
  type: SUBSCRIBE_AUDIO_DEVICES,
});

export const unsubscribeAudioDevices = (): UnsubscribeAudioDevicesAction => ({
  type: UNSUBSCRIBE_AUDIO_DEVICES,
});

export const audioDeviceChanged = (event: AudioDeviceChangeEvent): AudioDeviceChangedAction => ({
  type: AUDIO_DEVICE_CHANGED,
  payload: { event },
});

export const audioDevicesStreamOpened = (): AudioDevicesStreamOpenedAction => ({
  type: AUDIO_DEVICES_STREAM_OPENED,
});

export const audioDevicesStreamClosed = (): AudioDevicesStreamClosedAction => ({
  type: AUDIO_DEVICES_STREAM_CLOSED,
});
