export const ROUTES = {
    onboarding: "/onboarding",
    home: "/",
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
