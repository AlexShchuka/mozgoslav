"""Runtime configuration for the sidecar.

Values are read from environment variables (prefix ``MOZGOSLAV_SIDECAR_``)
and fall back to the defaults captured in docs/original-idea/DEFAULT-CONFIG.md.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings.

    The sidecar binds to ``localhost:5060`` by default because it is meant
    to be launched and consumed by the local C# backend only.
    """

    model_config = SettingsConfigDict(
        env_prefix="MOZGOSLAV_SIDECAR_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = Field(default="127.0.0.1", description="Bind address.")
    port: int = Field(default=5060, description="Bind port.")
    log_level: str = Field(default="info", description="Uvicorn log level.")
    app_title: str = Field(default="Mozgoslav ML Sidecar")
    app_version: str = Field(default="0.1.0")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached :class:`Settings` instance."""

    return Settings()
