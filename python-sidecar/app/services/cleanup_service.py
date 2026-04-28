from __future__ import annotations

import re

from app.models.schemas import CleanupLevel, CleanupRequest, CleanupResponse

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

_AGGRESSIVE_EXTRA: tuple[str, ...] = (
    "ну вот",
    "ну это",
    "ну типа",
    "вот это",
    "ну короче",
)


def _build_pattern(fillers: tuple[str, ...]) -> re.Pattern[str]:

    ordered = sorted(fillers, key=len, reverse=True)
    alternation = "|".join(re.escape(word) for word in ordered)
    return re.compile(rf"(?ui)\b(?:{alternation})\b[,\s]*")


_LIGHT_PATTERN = _build_pattern(_LIGHT_FILLERS)
_AGGRESSIVE_PATTERN = _build_pattern(_AGGRESSIVE_EXTRA + _LIGHT_FILLERS)

_DUPLICATE_WORDS = re.compile(r"(?ui)\b(\w+)\s+\1\b")
_MULTI_WS = re.compile(r"[ \t]+")
_DUPLICATE_COMMA = re.compile(r"\s*,\s*,")
_SPACE_BEFORE_PUNCT = re.compile(r"\s+([,.!?])")


class CleanupService:
    def cleanup(self, request: CleanupRequest) -> CleanupResponse:
        cleaned = self._apply(request.text, request.level)
        return CleanupResponse(cleaned=cleaned)

    def _apply(self, text: str, level: CleanupLevel) -> str:
        if level is CleanupLevel.none:
            return text

        pattern = (
            _AGGRESSIVE_PATTERN if level is CleanupLevel.aggressive else _LIGHT_PATTERN
        )

        out = pattern.sub("", text)
        out = _DUPLICATE_WORDS.sub(r"\1", out)
        out = _MULTI_WS.sub(" ", out)
        out = _DUPLICATE_COMMA.sub(",", out)
        out = _SPACE_BEFORE_PUNCT.sub(r"\1", out)
        return out.strip()
