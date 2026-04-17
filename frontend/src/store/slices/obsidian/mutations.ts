import type { ObsidianState } from "./types";

// Shared transitions used by reducer cases. `error` always clears on the
// success branches so a stale message from a previous attempt doesn't leak
// into the UI after a retry.
export const beginSetup = (state: ObsidianState): ObsidianState => ({
  ...state,
  isSetupInProgress: true,
  error: null,
});

export const beginBulkExport = (state: ObsidianState): ObsidianState => ({
  ...state,
  isBulkExporting: true,
  error: null,
});

export const beginApplyLayout = (state: ObsidianState): ObsidianState => ({
  ...state,
  isApplyingLayout: true,
  error: null,
});
