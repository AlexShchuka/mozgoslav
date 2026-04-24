import type { BackupFile } from "./types";

export const LOAD_BACKUPS = "backups/LOAD";
export const LOAD_BACKUPS_SUCCESS = "backups/LOAD_SUCCESS";
export const LOAD_BACKUPS_FAILURE = "backups/LOAD_FAILURE";

export const CREATE_BACKUP = "backups/CREATE";
export const CREATE_BACKUP_SUCCESS = "backups/CREATE_SUCCESS";
export const CREATE_BACKUP_FAILURE = "backups/CREATE_FAILURE";

export interface LoadBackupsAction {
  type: typeof LOAD_BACKUPS;
}

export interface LoadBackupsSuccessAction {
  type: typeof LOAD_BACKUPS_SUCCESS;
  payload: BackupFile[];
}

export interface LoadBackupsFailureAction {
  type: typeof LOAD_BACKUPS_FAILURE;
  payload: string;
}

export interface CreateBackupAction {
  type: typeof CREATE_BACKUP;
}

export interface CreateBackupSuccessAction {
  type: typeof CREATE_BACKUP_SUCCESS;
  payload: BackupFile;
}

export interface CreateBackupFailureAction {
  type: typeof CREATE_BACKUP_FAILURE;
  payload: string;
}

export type BackupsAction =
  | LoadBackupsAction
  | LoadBackupsSuccessAction
  | LoadBackupsFailureAction
  | CreateBackupAction
  | CreateBackupSuccessAction
  | CreateBackupFailureAction;

export const loadBackups = (): LoadBackupsAction => ({ type: LOAD_BACKUPS });
export const loadBackupsSuccess = (items: BackupFile[]): LoadBackupsSuccessAction => ({
  type: LOAD_BACKUPS_SUCCESS,
  payload: items,
});
export const loadBackupsFailure = (message: string): LoadBackupsFailureAction => ({
  type: LOAD_BACKUPS_FAILURE,
  payload: message,
});

export const createBackup = (): CreateBackupAction => ({ type: CREATE_BACKUP });
export const createBackupSuccess = (item: BackupFile): CreateBackupSuccessAction => ({
  type: CREATE_BACKUP_SUCCESS,
  payload: item,
});
export const createBackupFailure = (message: string): CreateBackupFailureAction => ({
  type: CREATE_BACKUP_FAILURE,
  payload: message,
});
