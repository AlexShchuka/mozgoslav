from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):

    status: str = Field(default="ok")
    version: str
    service: str = Field(default="mozgoslav-python-sidecar")


class ErrorResponse(BaseModel):

    detail: str
