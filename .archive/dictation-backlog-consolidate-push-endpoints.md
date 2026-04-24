# consolidate dictation push endpoints

Two push endpoints coexist: JSON samples on `/api/dictation/push/{id}` and raw PCM on `/api/dictation/{id}/push`. Same logical operation, two payload shapes. Pick the winning shape, retire the other, update callers in lockstep.
