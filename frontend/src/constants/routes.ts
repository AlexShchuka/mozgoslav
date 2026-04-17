export const ROUTES = {
  onboarding: "/onboarding",
  dashboard: "/",
  queue: "/queue",
  notes: "/notes",
  note: "/notes/:id",
  rag: "/rag",
  profiles: "/profiles",
  models: "/models",
  settings: "/settings",
  logs: "/logs",
  backup: "/backup",
} as const;

export const noteRoute = (id: string) => `/notes/${id}`;
