export const BACKEND_URL = "http://localhost:5050";

export const HEALTH_POLL_INTERVAL_MS = 5000;

// Endpoint registry — kept in lockstep with `docs/adr/ADR-007-shared.md §2`.
// Frontend features import from here; never hard-code a path elsewhere.
export const API_ENDPOINTS = {
  // --- health ---
  health: "/api/health",
  llmHealth: "/api/health/llm",

  // --- recordings ---
  recordings: "/api/recordings",
  recordingsImport: "/api/recordings/import",
  recordingsUpload: "/api/recordings/upload",
  recording: (id: string) => `/api/recordings/${id}`,
  recordingNotes: (id: string) => `/api/recordings/${id}/notes`,
  reprocess: (id: string) => `/api/recordings/${id}/reprocess`,

  // --- jobs / queue ---
  jobs: "/api/jobs",
  jobsActive: "/api/jobs/active",
  jobsStream: "/api/jobs/stream",
  enqueueJob: "/api/jobs",
  // ADR-015 — POST /api/jobs/{id}/cancel. Happy-path returns:
  // 204 (Queued), 202 (Active), 409 (terminal), 404 (unknown).
  queueCancel: (id: string) => `/api/jobs/${id}/cancel`,

  // --- notes ---
  notes: "/api/notes",
  note: (id: string) => `/api/notes/${id}`,
  noteExport: (id: string) => `/api/notes/${id}/export`,

  // --- profiles ---
  profiles: "/api/profiles",
  profile: (id: string) => `/api/profiles/${id}`,
  duplicateProfile: (id: string) => `/api/profiles/${id}/duplicate`,

  // --- settings ---
  settings: "/api/settings",

  // --- models ---
  models: "/api/models",
  modelDownload: "/api/models/download",
  modelsDownloadStream: "/api/models/download/stream",
  modelsScan: (dir: string) => `/api/models/scan?dir=${encodeURIComponent(dir)}`,

  // --- meetily ---
  meetilyImport: "/api/meetily/import",

  // --- obsidian ---
  obsidianSetup: "/api/obsidian/setup",
  obsidianExportAll: "/api/obsidian/export-all",
  obsidianApplyLayout: "/api/obsidian/apply-layout",

  // --- logs ---
  logs: "/api/logs",
  logsTail: "/api/logs/tail",

  // --- backup ---
  backup: "/api/backup",
  backupCreate: "/api/backup/create",

  // --- sync (Syncthing bridge) ---
  syncStatus: "/api/sync/status",
  syncHealth: "/api/sync/health",
  syncPairingPayload: "/api/sync/pairing-payload",
  syncAcceptDevice: "/api/sync/accept-device",
  syncEvents: "/api/sync/events",

  // --- rag ---
  ragQuery: "/api/rag/query",
  ragReindex: "/api/rag/reindex",

  // --- dictation (push audio, lifecycle) ---
  dictationStart: "/api/dictation/start",
  dictationPush: (sessionId: string) => `/api/dictation/${sessionId}/push`,
  dictationStop: (sessionId: string) => `/api/dictation/stop/${sessionId}`,
} as const;
