import type { Reducer } from "redux";

import {
  CREATE_BACKUP,
  CREATE_BACKUP_FAILURE,
  CREATE_BACKUP_SUCCESS,
  LOAD_BACKUPS,
  LOAD_BACKUPS_FAILURE,
  LOAD_BACKUPS_SUCCESS,
  type BackupsAction,
} from "./actions";
import { initialBackupsState, type BackupsState } from "./types";

export const backupsReducer: Reducer<BackupsState> = (
  state: BackupsState = initialBackupsState,
  action
): BackupsState => {
  const typed = action as BackupsAction;
  switch (typed.type) {
    case LOAD_BACKUPS:
      return { ...state, isLoading: true };
    case LOAD_BACKUPS_SUCCESS:
      return { ...state, isLoading: false, items: typed.payload };
    case LOAD_BACKUPS_FAILURE:
      return { ...state, isLoading: false };

    case CREATE_BACKUP:
      return { ...state, isCreating: true };
    case CREATE_BACKUP_SUCCESS:
      return { ...state, isCreating: false };
    case CREATE_BACKUP_FAILURE:
      return { ...state, isCreating: false };

    default:
      return state;
  }
};
