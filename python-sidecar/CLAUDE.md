# Python sidecar — guide for AI agents

FastAPI app with V3 ML endpoint stubs. Real ML work (diarization, gender, emotion, NER) is deferred until real models are downloaded on a macOS host.

```
python-sidecar/
├── app/
│   ├── main.py                 FastAPI app factory, /health, router includes
│   ├── config.py               pydantic-settings (host, port, log level)
│   ├── routers/                per-endpoint modules (diarize, gender, emotion, ner, cleanup)
│   ├── models/                 pydantic request/response schemas
│   └── services/               DiarizeService, GenderService, EmotionService, NerService, CleanupService
├── tests/                      pytest + TestClient (health + cleanup covered)
├── requirements.txt            production deps (heavy ML — installed on macOS only)
├── requirements-dev.txt        lightweight dev set (fastapi, uvicorn[standard], pytest, httpx, pydantic>=2)
└── .python-version             3.11
```

## Endpoints

- `GET /health` — real
- `POST /api/cleanup` — real (regex filler removal for Light/Aggressive/None per profile)
- `POST /api/diarize` — stub (Silero VAD + Resemblyzer + sklearn AgglomerativeClustering — V3)
- `POST /api/gender` — stub (audeering/wav2vec2-large-robust-24-ft-age-gender — V3)
- `POST /api/emotion` — stub (audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim — V3)
- `POST /api/ner` — stub (Natasha — V3)

Stubs return contract-correct dummy payloads so the C# backend can be written against the real API contract today.

## Extending a stub into a real service

1. Ensure the matching `pip` package is in `requirements.txt`.
2. Implement the service (e.g. `DiarizeService.diarize(audio_path) -> list[Segment]`).
3. Wire it into the router (replace the dummy payload).
4. Add pytest coverage against a small fixture file.

## Dev loop

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload
pytest -q
```
