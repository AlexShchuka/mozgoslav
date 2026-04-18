"""ML model loading, path resolution and shared errors.

Split out of ``app/services/`` because the services consume these
utilities to look up on-disk weights and to signal "model not downloaded
yet" errors via :class:`ModelNotAvailableError`. The router layer
translates that exception into the 503 envelope documented in
``plan/v0.8/02-ml-sidecar-production.md §3.7``.
"""
