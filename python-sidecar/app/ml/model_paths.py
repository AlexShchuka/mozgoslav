"""Resolve on-disk paths for ML model artefacts.

The desktop app stores models in a single directory that holds both the
bundled Tier-1 files (shipped with the DMG) and the user-downloaded
Tier-2 files. The distinction is purely about *when* a file lands on
disk — at runtime, everything resolves through this module.

Environment::

    MOZGOSLAV_MODELS_DIR

  Absolute path. When unset, falls back to the macOS default
  ``~/Library/Application Support/Mozgoslav/models/``. The Electron
  launcher exports this variable when it spawns the sidecar so the
  sidecar sees the same directory as the C# backend.

Tier-2 resolvers return ``None`` when the expected directory / file is
missing — the caller re-raises as
:class:`app.ml.errors.ModelNotAvailableError` so the router can return
the 503 envelope instead of crashing.
"""
from __future__ import annotations

import os
from pathlib import Path


# Default macOS location. The Electron launcher always sets the env var
# so the hard-coded fallback is only used in Linux dev / CI where the
# path shape does not matter (tests inject an explicit root).
DEFAULT_ROOT = Path.home() / "Library" / "Application Support" / "Mozgoslav" / "models"

AUDEERING_GENDER_ID = "audeering-age-gender"
AUDEERING_GENDER_URL = (
    "https://huggingface.co/audeering/wav2vec2-large-robust-24-ft-age-gender"
)

AUDEERING_EMOTION_ID = "audeering-emotion-msp-dim"
AUDEERING_EMOTION_URL = (
    "https://huggingface.co/audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim"
)


class ModelPaths:
    """Path resolver for the on-disk model catalogue.

    Tier-1 (bundled) entries are expected to exist when the DMG ships;
    a missing bundled file is a packaging bug and we surface it loudly
    via :class:`FileNotFoundError` on first access. Tier-2 entries
    resolve to ``None`` when absent so the caller can decide whether to
    degrade (silero default weights via the pip package) or raise
    :class:`app.ml.errors.ModelNotAvailableError` (audeering gender /
    emotion have no free fallback).
    """

    def __init__(self, root: Path | None = None) -> None:
        if root is None:
            env_override = os.environ.get("MOZGOSLAV_MODELS_DIR")
            root = Path(env_override) if env_override else DEFAULT_ROOT
        self._root = root

    @property
    def root(self) -> Path:
        return self._root

    # ---- Tier 1 (bundled) --------------------------------------------------

    def silero_vad(self) -> Path | None:
        """Explicit ONNX override used by the python-sidecar diarizer.

        When absent we fall back to the weights shipped inside the
        ``silero-vad`` pip package — that is the Tier-1 guarantee, so
        this file is optional. Returning ``None`` communicates "use
        library defaults" to the caller.
        """

        candidate = self._root / "silero_vad.onnx"
        return candidate if candidate.is_file() else None

    # ---- Tier 2 (downloaded) -----------------------------------------------

    def audeering_gender(self) -> Path | None:
        """HuggingFace cache layout — the weights live under a
        ``model.safetensors`` or ``pytorch_model.bin`` inside the
        directory the user downloads.
        """

        directory = self._root / "audeering-age-gender"
        return directory if _looks_like_hf_cache(directory) else None

    def audeering_emotion(self) -> Path | None:
        directory = self._root / "audeering-emotion"
        return directory if _looks_like_hf_cache(directory) else None


def _looks_like_hf_cache(directory: Path) -> bool:
    """Heuristic match for a freshly-downloaded HuggingFace model dir.

    We accept any of ``model.safetensors`` / ``pytorch_model.bin`` +
    ``config.json`` combinations — the exact file layout depends on
    whether the user cloned the repo or downloaded via
    ``huggingface_hub``.
    """

    if not directory.is_dir():
        return False
    if not (directory / "config.json").is_file():
        return False
    weights = (
        (directory / "model.safetensors").is_file()
        or (directory / "pytorch_model.bin").is_file()
    )
    return weights
