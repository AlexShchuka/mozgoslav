"""Regex-based filler cleanup.

Implements the Light / Aggressive / None levels described in
``docs/original-idea/DEFAULT-CONFIG.md`` §7 and the reference code in
``docs/original-idea/PYTHON-SIDECAR-SPEC.md`` §5.5.

This service is real (no ML dependencies required) so the cleanup endpoint
ships its production contract today. The V3 work is limited to wiring the
audio pipeline services above.
"""
from __future__ import annotations

import re

from app.models.schemas import CleanupLevel, CleanupRequest, CleanupResponse

# Base single-word fillers (DEFAULT-CONFIG §7).
_LIGHT_FILLERS: tuple[str, ...] = (
    "ну",
    "это",
    "типа",
    "короче",
    "вот",
    "блин",
    "значит",
    "как бы",
    "в общем",
    "в принципе",
    "так сказать",
    "эээ",
    "ээ",
    "эх",
    "мм",
    "ммм",
    "мммм",
    "эм",
    "ээм",
)

# Aggressive level adds these composite fillers on top of the light set.
_AGGRESSIVE_EXTRA: tuple[str, ...] = (
    "ну вот",
    "ну это",
    "ну типа",
    "вот это",
    "ну короче",
)


def _build_pattern(fillers: tuple[str, ...]) -> re.Pattern[str]:
    """Compile a single alternation regex ordered longest-first.

    Longest-first matters: ``"ну вот"`` must win over ``"ну"`` alone.
    """

    ordered = sorted(fillers, key=len, reverse=True)
    alternation = "|".join(re.escape(word) for word in ordered)
    # \b does not anchor Cyrillic in Python's default ``re`` engine
    # unless UNICODE is enabled; re.UNICODE is the default in Py3.
    return re.compile(rf"(?ui)\b(?:{alternation})\b[,\s]*")


_LIGHT_PATTERN = _build_pattern(_LIGHT_FILLERS)
_AGGRESSIVE_PATTERN = _build_pattern(_AGGRESSIVE_EXTRA + _LIGHT_FILLERS)

# Duplicated adjacent words: "привет привет мир" -> "привет мир".
_DUPLICATE_WORDS = re.compile(r"(?ui)\b(\w+)\s+\1\b")
# Collapse consecutive spaces/tabs.
_MULTI_WS = re.compile(r"[ \t]+")
# Collapse doubled commas produced by filler removal.
_DUPLICATE_COMMA = re.compile(r"\s*,\s*,")
# Strip the space that may precede punctuation after filler removal.
_SPACE_BEFORE_PUNCT = re.compile(r"\s+([,.!?])")


class CleanupService:
    """Removes Russian filler words via regex substitutions."""

    def cleanup(self, request: CleanupRequest) -> CleanupResponse:
        cleaned = self._apply(request.text, request.level)
        return CleanupResponse(cleaned=cleaned)

    def _apply(self, text: str, level: CleanupLevel) -> str:
        if level is CleanupLevel.none:
            return text

        pattern = (
            _AGGRESSIVE_PATTERN
            if level is CleanupLevel.aggressive
            else _LIGHT_PATTERN
        )

        out = pattern.sub("", text)
        out = _DUPLICATE_WORDS.sub(r"\1", out)
        out = _MULTI_WS.sub(" ", out)
        out = _DUPLICATE_COMMA.sub(",", out)
        out = _SPACE_BEFORE_PUNCT.sub(r"\1", out)
        return out.strip()
