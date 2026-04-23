from __future__ import annotations


class ModelNotAvailableError(RuntimeError):

    def __init__(
        self, model_id: str, download_url: str, hint: str | None = None
    ) -> None:
        super().__init__(
            f"Model '{model_id}' is not installed. "
            f"Download from {download_url} before calling this endpoint."
        )
        self.model_id = model_id
        self.download_url = download_url
        self.hint = hint or ("Download via Settings → Models or the Onboarding wizard.")
