export interface SyncFolderSnapshot {
  readonly id: string;
  readonly state: string;
  readonly completionPct: number;
  readonly conflicts: number;
}

export interface SyncDeviceSnapshot {
  readonly id: string;
  readonly name: string;
  readonly connected: boolean;
  readonly lastSeen: string | null;
}

export interface SyncStatusSnapshot {
  readonly folders: readonly SyncFolderSnapshot[];
  readonly devices: readonly SyncDeviceSnapshot[];
}

export interface SyncPairingPayload {
  readonly deviceId: string;
  readonly folderIds: readonly string[];
  readonly uri: string;
}

export interface SyncPendingDevice {
  readonly deviceId: string;
  readonly name: string;
  readonly address: string | null;
}

// ADR-003 D5: the backend forwards a JSON-serialized Syncthing event per SSE
// frame. Only four categories interest the UI today — everything else arrives
// with `type` set and the discriminator fields null, and is discarded.
export interface SyncEvent {
  readonly id: number;
  readonly type: string;
  readonly time: string;
  readonly folderCompletion: SyncFolderCompletion | null;
  readonly deviceConnection: SyncDeviceConnection | null;
  readonly pendingDevices: readonly SyncPendingDevice[] | null;
  readonly fileConflict: SyncFileConflict | null;
}

export interface SyncFolderCompletion {
  readonly folderId: string;
  readonly completionPct: number;
}

export interface SyncDeviceConnection {
  readonly deviceId: string;
  readonly connected: boolean;
}

export interface SyncFileConflict {
  readonly folderId: string;
  readonly path: string;
}

export interface SyncState {
  readonly status: SyncStatusSnapshot | null;
  readonly pairing: SyncPairingPayload | null;
  readonly pendingDevices: readonly SyncPendingDevice[];
  readonly lastEvent: SyncEvent | null;
  readonly streamConnected: boolean;
  readonly isLoadingStatus: boolean;
  readonly isLoadingPairing: boolean;
  readonly acceptingDeviceId: string | null;
  readonly statusError: string | null;
  readonly pairingError: string | null;
  readonly acceptError: string | null;
}

export const initialSyncState: SyncState = {
  status: null,
  pairing: null,
  pendingDevices: [],
  lastEvent: null,
  streamConnected: false,
  isLoadingStatus: false,
  isLoadingPairing: false,
  acceptingDeviceId: null,
  statusError: null,
  pairingError: null,
  acceptError: null,
};
