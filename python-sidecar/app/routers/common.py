"""Shared router helpers.

Right now, only the 503 envelope for
:class:`app.ml.errors.ModelNotAvailableError` — every Tier-2 router
translates that exception into an identical HTTP response, so the
formatting lives here.
"""
from __future__ import annotations

from fastapi import HTTPException
from fastapi.responses import JSONResponse

from app.ml.errors import ModelNotAvailableError


MODEL_NOT_INSTALLED_STATUS = 503


def model_not_installed_response(error: ModelNotAvailableError) -> JSONResponse:
    """Build the 503 envelope documented in
    ``plan/v0.8/02-ml-sidecar-production.md §3.7``.
    """

    return JSONResponse(
        status_code=MODEL_NOT_INSTALLED_STATUS,
        content={
            "error": "model_not_installed",
            "model_id": error.model_id,
            "download_url": error.download_url,
            "hint": error.hint,
        },
    )


def raise_model_not_installed(error: ModelNotAvailableError) -> None:
    """Alternative flow: raise an HTTPException so FastAPI serialises it.

    Kept alongside :func:`model_not_installed_response` because the two
    shapes are the only callers we need — one for routes that want to
    return the envelope directly, one for routes that raise.
    """

    raise HTTPException(
        status_code=MODEL_NOT_INSTALLED_STATUS,
        detail={
            "error": "model_not_installed",
            "model_id": error.model_id,
            "download_url": error.download_url,
            "hint": error.hint,
        },
    )
