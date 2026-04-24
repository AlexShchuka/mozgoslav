export interface BackupFile {
  readonly name: string;
  readonly path: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

export interface BackupsState {
  readonly items: readonly BackupFile[];
  readonly isLoading: boolean;
  readonly isCreating: boolean;
}

export const initialBackupsState: BackupsState = {
  items: [],
  isLoading: false,
  isCreating: false,
};
