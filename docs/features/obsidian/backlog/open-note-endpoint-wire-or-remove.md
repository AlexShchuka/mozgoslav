# open-note endpoint — wire or remove

`/api/obsidian/open` opens a note through the Local REST API plugin and has zero callers today. Either surface it from the notes UI (deep-link to the running vault) or delete the handler plus the `IObsidianRestClient.OpenNoteAsync` surface.
