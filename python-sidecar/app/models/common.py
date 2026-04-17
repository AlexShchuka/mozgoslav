"""Shared response schemas used across endpoints."""
from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Result of the ``GET /health`` probe."""

    status: str = Field(default="ok")
    version: str
    service: str = Field(default="mozgoslav-python-sidecar")


class ErrorResponse(BaseModel):
    """Uniform error payload."""

    detail: str
