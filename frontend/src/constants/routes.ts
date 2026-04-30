export const ROUTES = {
  onboarding: "/onboarding",
  home: "/",
  dashboard: "/",
  queue: "/queue",
  notes: "/notes",
  note: "/notes/:id",
  rag: "/rag",
  ask: "/ask",
  profiles: "/profiles",
  models: "/models",
  settings: "/settings",
  backup: "/backup",
  obsidian: "/obsidian",
  sync: "/sync",
  routines: "/routines",
  prompts: "/prompts",
  monitoring: "/monitoring",
} as const;

export const noteRoute = (id: string) => `/notes/${id}`;
