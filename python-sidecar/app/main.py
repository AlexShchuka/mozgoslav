"""FastAPI application factory and ASGI entry point.

The sidecar runs locally (``localhost:5060``) and is consumed by the
C# backend. Dev CORS is wide-open because every caller is on the same
loopback interface; production deployment is out of scope for this
scaffold (the sidecar is launched as a child process of the desktop app).

Run with::

    uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.models.common import HealthResponse
from app.routers import cleanup, diarize, emotion, gender, ner


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build a fully-wired FastAPI application."""

    cfg = settings or get_settings()

    app = FastAPI(
        title=cfg.app_title,
        version=cfg.app_version,
        description=(
            "Local ML sidecar for the Mozgoslav desktop app. "
            "Endpoints cover diarization, gender, emotion, NER and "
            "filler cleanup. All heavy ML endpoints are V3 stubs in this "
            "scaffold; only /api/cleanup is production-ready."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", response_model=HealthResponse, tags=["meta"])
    async def health() -> HealthResponse:
        return HealthResponse(version=cfg.app_version)

    app.include_router(diarize.router)
    app.include_router(gender.router)
    app.include_router(emotion.router)
    app.include_router(ner.router)
    app.include_router(cleanup.router)

    return app


app = create_app()
