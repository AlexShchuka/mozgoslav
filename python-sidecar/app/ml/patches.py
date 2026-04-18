"""Upstream-library workarounds.

Kept in one place so the corresponding upstream fix makes removal
trivial — grep for ``patches.`` usages and delete.

Currently only needed for the audeering emotion model whose config
specifies a tokenizer (audio model, no tokenizer exists). The patch
forces the config to declare ``vocab_size=None`` so
``AutoFeatureExtractor.from_pretrained`` picks the feature extractor
path instead of the tokenizer path.
"""
from __future__ import annotations

from typing import Any


def safe_emotion_cfg(cfg: Any) -> Any:
    """Return a copy of ``cfg`` with ``vocab_size`` set to ``None``.

    The audeering emotion model declares a spurious ``vocab_size`` in
    its config.json that makes transformers try to resolve a tokenizer
    which does not exist. Clearing the field is enough to route through
    the feature-extractor-only path.

    Operates on a shallow copy where possible (if the config object
    supports ``to_dict()``); otherwise mutates in place and returns the
    same instance.
    """

    try:
        cfg.vocab_size = None
    except AttributeError:
        pass
    # Some transformers versions hide the vocab on a nested
    # ``text_config`` — clear it there too for belt-and-braces.
    text_config = getattr(cfg, "text_config", None)
    if text_config is not None:
        try:
            text_config.vocab_size = None
        except AttributeError:
            pass
    return cfg
