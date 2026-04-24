# cancel UI affordance

Backend exposes `POST /api/dictation/cancel/{id}` but no UI reaches it today. Add a cancel control to the active dictation surface (overlay and session row) and wire it to the existing endpoint. Session manager and PCM-stream cancel propagation are already in place downstream.
