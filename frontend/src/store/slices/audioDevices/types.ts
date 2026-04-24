export interface AudioDevice {
  readonly name: string;
  readonly isDefault: boolean;
}

export interface AudioDeviceChangeEvent {
  readonly id: number;
  readonly kind: string;
  readonly defaultName: string;
}

export interface AudioDevicesState {
  readonly lastChange: AudioDeviceChangeEvent | null;
}

export const initialAudioDevicesState: AudioDevicesState = { lastChange: null };
