from __future__ import annotations

from app.models.schemas import NerRequest, NerResponse


class NerService:
    def __init__(self) -> None:
        self._segmenter = None
        self._morph_vocab = None
        self._morph_tagger = None
        self._ner_tagger = None
        self._dates_extractor = None

    def extract(self, request: NerRequest) -> NerResponse:
        text = (request.text or "").strip()
        if not text:
            return NerResponse(people=[], orgs=[], locations=[], dates=[])

        self._ensure_loaded()
        people, orgs, locations = self._extract_spans(text)
        dates = self._extract_dates(text)

        return NerResponse(
            people=_dedupe(people),
            orgs=_dedupe(orgs),
            locations=_dedupe(locations),
            dates=_dedupe(dates),
        )

    def _ensure_loaded(self) -> None:
        if self._ner_tagger is not None:
            return

        from natasha import (  # noqa: PLC0415
            DatesExtractor,
            MorphVocab,
            NewsEmbedding,
            NewsMorphTagger,
            NewsNERTagger,
            Segmenter,
        )

        self._segmenter = Segmenter()
        self._morph_vocab = MorphVocab()
        embedding = NewsEmbedding()
        self._morph_tagger = NewsMorphTagger(embedding)
        self._ner_tagger = NewsNERTagger(embedding)
        self._dates_extractor = DatesExtractor(self._morph_vocab)

    def _extract_spans(self, text: str) -> tuple[list[str], list[str], list[str]]:
        from natasha import Doc  # noqa: PLC0415

        doc = Doc(text)
        doc.segment(self._segmenter)
        doc.tag_morph(self._morph_tagger)
        doc.tag_ner(self._ner_tagger)

        people: list[str] = []
        orgs: list[str] = []
        locations: list[str] = []

        for span in doc.spans:
            span.normalize(self._morph_vocab)
            text_value = span.normal or span.text
            if span.type == "PER":
                people.append(text_value)
            elif span.type == "ORG":
                orgs.append(text_value)
            elif span.type == "LOC":
                locations.append(text_value)
        return people, orgs, locations

    def _extract_dates(self, text: str) -> list[str]:
        dates: list[str] = []
        for match in self._dates_extractor(text):
            fact = match.fact
            parts = [
                str(fact.day) if fact.day else None,
                str(fact.month) if fact.month else None,
                str(fact.year) if fact.year else None,
            ]
            cleaned = [p for p in parts if p]
            if cleaned:
                dates.append(".".join(cleaned))
        return dates


def _dedupe(values: list[str]) -> list[str]:

    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        key = value.strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(value.strip())
    return out
