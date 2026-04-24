# open note from UI

`POST /api/obsidian/open` reveals a note inside the running Obsidian via the Local REST API plugin. Handler and client method exist, nothing on the frontend reaches it. Add a "Open in Obsidian" control on the note viewer that calls the endpoint — complements the existing "reveal in Finder" bridge for users who keep Obsidian running.
