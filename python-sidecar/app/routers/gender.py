from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.ml.errors import ModelNotAvailableError
from app.ml.loader import get_gender_service
from app.models.schemas import GenderRequest, GenderResponse
from app.routers.common import model_not_installed_response

router = APIRouter(prefix="/api", tags=["gender"])


@router.post(
    "/gender",
    response_model=GenderResponse,
    responses={503: {"description": "Model not installed"}},
)
async def classify_gender(
    payload: GenderRequest,
    service=Depends(get_gender_service),  # noqa: ANN001 — deferred import
):
    try:
        result = service.classify(payload)
    except ModelNotAvailableError as ex:
        return model_not_installed_response(ex)
    except FileNotFoundError as ex:
        raise HTTPException(status_code=404, detail=str(ex)) from ex
    return JSONResponse(content=result.model_dump())
