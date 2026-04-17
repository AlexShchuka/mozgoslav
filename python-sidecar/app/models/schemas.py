"""Request/response schemas for every sidecar endpoint.

Contracts intentionally mirror the ones described in
``docs/original-idea/PYTHON-SIDECAR-SPEC.md``. The brief for this scaffold
requires JSON everywhere (no multipart uploads yet), so audio inputs are
carried as on-disk paths addressed by the local C# backend.
"""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


# ---- Diarization -----------------------------------------------------------


class DiarizeRequest(BaseModel):
    audio_path: str = Field(..., description="Absolute path to a 16 kHz mono WAV file.")
    min_speakers: int | None = Field(default=None, ge=1)
    max_speakers: int | None = Field(default=None, ge=1)


class SpeakerSegment(BaseModel):
    speaker: str = Field(..., description="Cluster label, e.g. 'A' or 'SPEAKER_00'.")
    start: float = Field(..., ge=0.0, description="Start time in seconds.")
    end: float = Field(..., ge=0.0, description="End time in seconds.")


class DiarizeResponse(BaseModel):
    segments: list[SpeakerSegment]
    num_speakers: int = Field(..., ge=0)


# ---- Gender ----------------------------------------------------------------


class GenderRequest(BaseModel):
    audio_path: str


class GenderResponse(BaseModel):
    gender: str = Field(..., description="One of: 'male', 'female', 'unknown'.")
    confidence: float = Field(..., ge=0.0, le=1.0)


# ---- Emotion ---------------------------------------------------------------


class EmotionRequest(BaseModel):
    audio_path: str


class EmotionResponse(BaseModel):
    emotion: str = Field(..., description="Label, e.g. 'neutral', 'joy', 'sad'.")
    valence: float = Field(..., ge=-1.0, le=1.0)
    arousal: float = Field(..., ge=-1.0, le=1.0)
    dominance: float = Field(..., ge=-1.0, le=1.0)


# ---- NER -------------------------------------------------------------------


class NerRequest(BaseModel):
    text: str


class NerResponse(BaseModel):
    people: list[str] = Field(default_factory=list)
    orgs: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    dates: list[str] = Field(default_factory=list)


# ---- Cleanup ---------------------------------------------------------------


class CleanupLevel(str, Enum):
    none = "none"
    light = "light"
    aggressive = "aggressive"


class CleanupRequest(BaseModel):
    text: str
    level: CleanupLevel = Field(default=CleanupLevel.light)


class CleanupResponse(BaseModel):
    cleaned: str


# ---- Embeddings ------------------------------------------------------------


class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Non-empty text to embed.")


class EmbedResponse(BaseModel):
    embedding: list[float] = Field(..., description="L2-normalised vector.")
    dim: int = Field(..., gt=0, description="Vector dimensionality.")
