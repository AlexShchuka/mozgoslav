from __future__ import annotations

import os
from pathlib import Path


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

    def __init__(self, root: Path | None = None) -> None:
        if root is None:
            env_override = os.environ.get("MOZGOSLAV_MODELS_DIR")
            root = Path(env_override) if env_override else DEFAULT_ROOT
        self._root = root

    @property
    def root(self) -> Path:
        return self._root


    def silero_vad(self) -> Path | None:

        candidate = self._root / "silero_vad.onnx"
        return candidate if candidate.is_file() else None


    def audeering_gender(self) -> Path | None:

        directory = self._root / "audeering-age-gender"
        return directory if _looks_like_hf_cache(directory) else None

    def audeering_emotion(self) -> Path | None:
        directory = self._root / "audeering-emotion"
        return directory if _looks_like_hf_cache(directory) else None


def _looks_like_hf_cache(directory: Path) -> bool:

    if not directory.is_dir():
        return False
    if not (directory / "config.json").is_file():
        return False
    weights = (
        (directory / "model.safetensors").is_file()
        or (directory / "pytorch_model.bin").is_file()
    )
    return weights
