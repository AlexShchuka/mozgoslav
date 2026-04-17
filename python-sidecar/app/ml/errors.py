"""Errors raised by ML services.

Kept minimal so every service and router can import from one place.
Router handlers translate :class:`ModelNotAvailableError` into the 503
envelope contract defined in
``plan/v0.8/02-ml-sidecar-production.md §3.7``::

    { "error": "model_not_installed",
      "model_id": "...",
      "download_url": "...",
      "hint": "Download via Settings → Models or the Onboarding wizard." }
"""
from __future__ import annotations


class ModelNotAvailableError(RuntimeError):
    """Raised by a Tier-2 service when its model files are absent.

    ``model_id`` is the stable catalogue identifier the UI uses to
    trigger a download; ``download_url`` points the user at the canonical
    source (HuggingFace). Both are forwarded verbatim to the client.
    """

    def __init__(self, model_id: str, download_url: str, hint: str | None = None) -> None:
        super().__init__(
            f"Model '{model_id}' is not installed. "
            f"Download from {download_url} before calling this endpoint."
        )
        self.model_id = model_id
        self.download_url = download_url
        self.hint = hint or (
            "Download via Settings → Models or the Onboarding wizard."
        )
