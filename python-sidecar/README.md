# Mozgoslav Python ML Sidecar

Local HTTP sidecar (FastAPI) that complements the C# backend with
ML tasks that only exist in the Python ecosystem: speaker diarization,
gender / emotion classification from audio, Russian NER (Natasha),
and regex filler cleanup.

The sidecar is a **V3 component**: the C# backend runs fine without it.
This repository currently holds the scaffold — the HTTP contracts are
live but the heavy-ML endpoints return stubbed payloads. Only
`/api/cleanup` is production-ready.

---

## Layout

```
python-sidecar/
├── app/
│   ├── config.py            pydantic-settings (host, port, log level)
│   ├── main.py              FastAPI factory + /health + router wiring
│   ├── models/              pydantic request/response schemas
│   ├── routers/             one module per endpoint
│   └── services/            business logic, DI-friendly
├── tests/                   pytest suite (httpx TestClient)
├── requirements.txt         full production stack (not installed in sandbox)
├── requirements-dev.txt     light set for local verification
└── pyproject.toml
```

---

## Local development

Python 3.11 is required (`.python-version` pins the runtime).

```bash
cd python-sidecar
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

Verify the import and run the tests:

```bash
python -c "from app.main import app; print('imports ok')"
pytest -q
```

Run the server:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload
```

Health probe:

```bash
curl http://127.0.0.1:5060/health
```

Interactive docs: <http://127.0.0.1:5060/docs>.

---

## Production install

Production needs the full ML stack (torch, transformers, natasha, ...).
That is roughly 4 GB, so it is **not** installed in the sandbox.

```bash
pip install -r requirements.txt
```

Recommended target: macOS Apple Silicon (M3/M4), 36 GB RAM. The sidecar
is launched by the Electron shell as a child process bound to
`127.0.0.1:5060`.

---

## Endpoints

| Method | Path           | Contract                                                  | Status |
|--------|----------------|-----------------------------------------------------------|--------|
| GET    | `/health`      | `{status, version, service}`                              | real   |
| POST   | `/api/diarize` | `{audio_path, min_speakers?, max_speakers?}` → segments   | stub   |
| POST   | `/api/gender`  | `{audio_path}` → `{gender, confidence}`                   | stub   |
| POST   | `/api/emotion` | `{audio_path}` → `{emotion, valence, arousal, dominance}` | stub   |
| POST   | `/api/ner`     | `{text}` → `{people, orgs, locations, dates}`             | stub   |
| POST   | `/api/cleanup` | `{text, level}` → `{cleaned}`                             | real   |

All endpoints accept and return JSON. Errors use FastAPI's default
`HTTPException` envelope. CORS is permissive in dev.

Full contract details are declared in `app/models/schemas.py`.

---

## Configuration

Environment variables (prefix `MOZGOSLAV_SIDECAR_`):

| Variable                      | Default     |
|-------------------------------|-------------|
| `MOZGOSLAV_SIDECAR_HOST`      | `127.0.0.1` |
| `MOZGOSLAV_SIDECAR_PORT`      | `5060`      |
| `MOZGOSLAV_SIDECAR_LOG_LEVEL` | `info`      |

A `.env` file in the sidecar root is honoured.

---

## V3 work remaining

See `TODO.md` for the list of stubs to replace with real model loaders.
