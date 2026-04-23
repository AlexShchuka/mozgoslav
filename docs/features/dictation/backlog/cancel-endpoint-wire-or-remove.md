# cancel endpoint — wire or remove

`/api/dictation/cancel/{id}` has a live backend handler and zero callers. Either wire it from the session UI (cancel-in-flight affordance) or delete the handler and the session-manager `CancelAsync` path.
