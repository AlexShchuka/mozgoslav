# retire bag-of-words embedding fallback

`BagOfWordsEmbeddingService` exists as a dev-time fallback when the Python sidecar is not running. Once the sidecar's `/api/embed` is production-stable and always reachable in the ship path, retire the fallback — the dual wiring lets silent quality regressions ride if the sidecar quietly fails to start.
