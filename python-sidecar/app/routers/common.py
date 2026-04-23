from __future__ import annotations

from fastapi import HTTPException
from fastapi.responses import JSONResponse

from app.ml.errors import ModelNotAvailableError


MODEL_NOT_INSTALLED_STATUS = 503


def model_not_installed_response(error: ModelNotAvailableError) -> JSONResponse:

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

    raise HTTPException(
        status_code=MODEL_NOT_INSTALLED_STATUS,
        detail={
            "error": "model_not_installed",
            "model_id": error.model_id,
            "download_url": error.download_url,
            "hint": error.hint,
        },
    )
