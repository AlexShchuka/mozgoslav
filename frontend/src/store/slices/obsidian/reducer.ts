import type { Reducer } from "redux";

import {
  FETCH_DIAGNOSTICS,
  FETCH_DIAGNOSTICS_DONE,
  FETCH_DIAGNOSTICS_FAILED,
  type ObsidianAction,
  REAPPLY_BOOTSTRAP,
  REAPPLY_BOOTSTRAP_DONE,
  REINSTALL_PLUGINS,
  REINSTALL_PLUGINS_DONE,
  SETUP_OBSIDIAN,
  SETUP_OBSIDIAN_DONE,
} from "./actions";
import {
  beginDiagnosticsLoad,
  beginReapplyBootstrap,
  beginReinstallPlugins,
  beginSetup,
  setDiagnostics,
  setDiagnosticsError,
} from "./mutations";
import { initialObsidianState, type ObsidianState } from "./types";

export const obsidianReducer: Reducer<ObsidianState> = (
  state: ObsidianState = initialObsidianState,
  action
): ObsidianState => {
  const typed = action as ObsidianAction;
  switch (typed.type) {
    case SETUP_OBSIDIAN:
      return beginSetup(state);
    case SETUP_OBSIDIAN_DONE:
      return { ...state, isSetupInProgress: false };

    case FETCH_DIAGNOSTICS:
      return beginDiagnosticsLoad(state);
    case FETCH_DIAGNOSTICS_DONE:
      return setDiagnostics(state, typed.payload.report);
    case FETCH_DIAGNOSTICS_FAILED:
      return setDiagnosticsError(state, typed.payload.error);

    case REAPPLY_BOOTSTRAP:
      return beginReapplyBootstrap(state);
    case REAPPLY_BOOTSTRAP_DONE:
      return { ...state, isReapplyingBootstrap: false };

    case REINSTALL_PLUGINS:
      return beginReinstallPlugins(state);
    case REINSTALL_PLUGINS_DONE:
      return { ...state, isReinstallingPlugins: false };

    default:
      return state;
  }
};
