export const BACKEND_URL = "http://localhost:5050";

export const HEALTH_POLL_INTERVAL_MS = 5000;

export const API_ENDPOINTS = {
  health: "/api/health",
  llmHealth: "/api/health/llm",

  recordings: "/api/recordings",
  recordingsImport: "/api/recordings/import",
  recordingsUpload: "/api/recordings/upload",
  recording: (id: string) => `/api/recordings/${id}`,
  recordingNotes: (id: string) => `/api/recordings/${id}/notes`,
  reprocess: (id: string) => `/api/recordings/${id}/reprocess`,

  jobs: "/api/jobs",
  jobsActive: "/api/jobs/active",
  jobsStream: "/api/jobs/stream",
  devicesStream: "/api/devices/stream",
  enqueueJob: "/api/jobs",
  queueCancel: (id: string) => `/api/jobs/${id}/cancel`,

  notes: "/api/notes",
  note: (id: string) => `/api/notes/${id}`,
  noteExport: (id: string) => `/api/notes/${id}/export`,

  profiles: "/api/profiles",
  profile: (id: string) => `/api/profiles/${id}`,
  duplicateProfile: (id: string) => `/api/profiles/${id}/duplicate`,

  settings: "/api/settings",

  models: "/api/models",
  modelDownload: "/api/models/download",
  modelsDownloadStream: "/api/models/download/stream",
  modelsScan: (dir: string) => `/api/models/scan?dir=${encodeURIComponent(dir)}`,

  meetilyImport: "/api/meetily/import",

  obsidianSetup: "/api/obsidian/setup",
  obsidianExportAll: "/api/obsidian/export-all",
  obsidianApplyLayout: "/api/obsidian/apply-layout",
  obsidianDiagnostics: "/api/obsidian/diagnostics",
  obsidianReapplyBootstrap: "/api/obsidian/reapply-bootstrap",
  obsidianReinstallPlugins: "/api/obsidian/reinstall-plugins",

  logs: "/api/logs",
  logsTail: "/api/logs/tail",

  backup: "/api/backup",
  backupCreate: "/api/backup/create",

  syncStatus: "/api/sync/status",
  syncHealth: "/api/sync/health",
  syncPairingPayload: "/api/sync/pairing-payload",
  syncAcceptDevice: "/api/sync/accept-device",
  syncEvents: "/api/sync/events",

  ragQuery: "/api/rag/query",
  ragReindex: "/api/rag/reindex",
  ragStatus: "/api/rag/status",

  dictationStart: "/api/dictation/start",
  dictationPush: (sessionId: string) => `/api/dictation/${sessionId}/push`,
  dictationStop: (sessionId: string) => `/api/dictation/stop/${sessionId}`,
} as const;
