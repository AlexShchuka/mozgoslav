export const ROUTES = {
  onboarding: "/onboarding",
  // Task L1 — unified Dashboard + Queue at the root route, labelled "Мозгослав".
  home: "/",
  // Kept for backward-compat deep-links; App.tsx redirects them to `home`.
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
  obsidian: "/obsidian",
  sync: "/sync",
} as const;

export const noteRoute = (id: string) => `/notes/${id}`;
