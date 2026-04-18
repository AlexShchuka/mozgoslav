"""Tests for ``app/ml/model_paths.py``.

The resolver is simple — exercise the branches that decide whether a
Tier-2 model is "installed": valid HuggingFace-shaped directory vs
missing directory vs directory without weights.
"""
from __future__ import annotations

from pathlib import Path

from app.ml.model_paths import ModelPaths


def test_silero_vad_returns_none_when_override_absent(tmp_path: Path) -> None:
    assert ModelPaths(tmp_path).silero_vad() is None


def test_silero_vad_returns_path_when_override_present(tmp_path: Path) -> None:
    override = tmp_path / "silero_vad.onnx"
    override.write_bytes(b"fake-onnx")
    assert ModelPaths(tmp_path).silero_vad() == override


def test_audeering_gender_requires_config_and_weights(tmp_path: Path) -> None:
    resolver = ModelPaths(tmp_path)
    assert resolver.audeering_gender() is None

    directory = tmp_path / "audeering-age-gender"
    directory.mkdir()
    assert resolver.audeering_gender() is None, "config.json alone must not satisfy"

    (directory / "config.json").write_text("{}")
    assert resolver.audeering_gender() is None, "weights file required"

    (directory / "model.safetensors").write_bytes(b"fake-weights")
    assert resolver.audeering_gender() == directory


def test_audeering_emotion_accepts_pytorch_bin(tmp_path: Path) -> None:
    resolver = ModelPaths(tmp_path)
    directory = tmp_path / "audeering-emotion"
    directory.mkdir()
    (directory / "config.json").write_text("{}")
    (directory / "pytorch_model.bin").write_bytes(b"fake")
    assert resolver.audeering_emotion() == directory


def test_root_reflects_env_override(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("MOZGOSLAV_MODELS_DIR", str(tmp_path))
    resolver = ModelPaths()
    assert resolver.root == tmp_path


def test_root_defaults_to_macos_library(monkeypatch) -> None:
    monkeypatch.delenv("MOZGOSLAV_MODELS_DIR", raising=False)
    resolver = ModelPaths()
    assert str(resolver.root).endswith("Mozgoslav/models")
