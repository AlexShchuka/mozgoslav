from __future__ import annotations

from typing import Any


def safe_emotion_cfg(cfg: Any) -> Any:

    try:
        cfg.vocab_size = None
    except AttributeError:
        pass
    text_config = getattr(cfg, "text_config", None)
    if text_config is not None:
        try:
            text_config.vocab_size = None
        except AttributeError:
            pass
    return cfg
