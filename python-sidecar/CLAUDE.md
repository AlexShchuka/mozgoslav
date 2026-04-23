# python-sidecar

FastAPI ML sidecar: diarize, gender, emotion, NER, cleanup, embedding.

## commands

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload
pytest
ruff check .
black --check .
```

## conventions

- Tier-2 endpoints return a typed `ModelNotAvailableError` when their model is not downloaded — consumers degrade gracefully, never crash.
- Heavy imports (`torch`, `transformers`, `librosa`, `silero_vad`) stay inside service methods. Module top-level imports must not pull ML wheels.
- Response shapes match the C# domain records on the backend side; they are the contract.
