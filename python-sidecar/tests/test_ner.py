from __future__ import annotations

from fastapi.testclient import TestClient

from app.services.ner_service import NerService
from app.models.schemas import NerRequest


def test_ner_extracts_person_and_location_from_russian_text() -> None:
    service = NerService()
    result = service.extract(NerRequest(
        text="Иван встретился с Мариной в Москве вчера."
    ))

    assert any("Иван" in name for name in result.people), result.people
    assert any("Марин" in name for name in result.people), result.people
    assert any("Моск" in loc for loc in result.locations), result.locations


def test_ner_extracts_organisation() -> None:
    service = NerService()
    result = service.extract(NerRequest(
        text="Компания Яндекс объявила о новом проекте."
    ))
    assert any("Яндекс" in org for org in result.orgs), result.orgs


def test_ner_extracts_date() -> None:
    service = NerService()
    result = service.extract(NerRequest(
        text="Встреча назначена на 15 мая 2024 года."
    ))
    assert result.dates, "date extractor must catch '15 мая 2024 года'"
    assert "2024" in result.dates[0]


def test_ner_empty_text_returns_empty_buckets() -> None:
    service = NerService()
    result = service.extract(NerRequest(text=""))
    assert result == type(result)(people=[], orgs=[], locations=[], dates=[])


def test_ner_dedupes_repeated_mentions() -> None:
    service = NerService()
    result = service.extract(NerRequest(
        text="Пётр пришёл. Пётр ушёл. Пётр вернулся."
    ))
    petr_count = sum(1 for name in result.people if "Пётр" in name or "Петр" in name)
    assert petr_count == 1, f"expected a single deduped Пётр entry, got {result.people}"


def test_ner_http_endpoint_returns_expected_shape(client: TestClient) -> None:
    response = client.post("/api/ner", json={
        "text": "Мария работает в Сбербанке в Санкт-Петербурге."
    })
    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"people", "orgs", "locations", "dates"}
    assert isinstance(payload["people"], list)
    assert isinstance(payload["orgs"], list)
    assert isinstance(payload["locations"], list)
    assert isinstance(payload["dates"], list)
