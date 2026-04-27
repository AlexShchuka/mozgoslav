from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.ml.loader import get_model_paths
from app.models.common import HealthResponse
from app.routers import cleanup, diarize, embed, emotion, gender, ner, processall, rerank, web_extract

_logger = logging.getLogger("mozgoslav.sidecar")


@asynccontextmanager
async def _lifespan(_app: FastAPI):

    _log_model_availability()
    yield


def create_app(settings: Settings | None = None) -> FastAPI:

    cfg = settings or get_settings()

    app = FastAPI(
        title=cfg.app_title,
        version=cfg.app_version,
        description=(
            "Local ML sidecar for the Mozgoslav desktop app. "
            "Endpoints cover diarization, gender, emotion, NER and "
            "filler cleanup. Tier-1 services (diarize + ner) always "
            "respond 200; Tier-2 services (gender + emotion) return "
            "503 with a download URL until the user installs the "
            "weights via Settings → Models."
        ),
        lifespan=_lifespan,
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
    app.include_router(embed.router)
    app.include_router(rerank.router)
    app.include_router(processall.router)
    app.include_router(web_extract.router)

    return app


def _log_model_availability() -> None:

    paths = get_model_paths()
    _logger.info("Sidecar models directory: %s", paths.root)
    _logger.info(
        "Tier 1 / Silero VAD override present: %s", paths.silero_vad() is not None
    )
    _logger.info(
        "Tier 2 / audeering age-gender installed: %s",
        paths.audeering_gender() is not None,
    )
    _logger.info(
        "Tier 2 / audeering emotion installed: %s",
        paths.audeering_emotion() is not None,
    )


app = create_app()
