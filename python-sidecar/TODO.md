# Python Sidecar — V3 TODO

Everything below is intentionally **not** implemented in the scaffold.
Each item maps to a production-ready service class; the stub currently in
place returns a hardcoded payload with the correct contract so the C#
client can be developed and tested today.

## Real ML implementations

- [ ] `app/services/diarize_service.py`
      Silero VAD (`silero-vad`) → per-segment Resemblyzer embeddings →
      `sklearn.cluster.AgglomerativeClustering(metric="cosine",
      distance_threshold=0.75)`. Short segments (< 0.7 s) get glued to
      the nearest cluster by time. See PYTHON-SIDECAR-SPEC §5.1.
- [ ] `app/services/gender_service.py`
      Load `audeering/wav2vec2-large-robust-24-ft-age-gender` with the
      custom `AgeGenderModel` / `AgeGenderHead` classes (PYTHON-SIDECAR-SPEC
      §5.2). Majority vote per speaker. `child` → `female`.
- [ ] `app/services/emotion_service.py`
      Load `audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim` via
      `AutoFeatureExtractor.from_pretrained` and apply the
      `vocab_size=None` patch (see workarounds §7.2 and §7.3). Map
      arousal/valence to a label.
- [ ] `app/services/ner_service.py`
      Initialise Natasha pipeline once at process start (Segmenter,
      MorphVocab, NewsNERTagger(NewsEmbedding), DatesExtractor). Bucket
      spans by type and format dates as `d.m.y`.

## Supporting scaffolding to add in V3

- [ ] `app/ml/loader.py` with `@lru_cache` singletons for every model
      so cold-start cost is paid once per process.
- [ ] `app/ml/patches.py` with the `_safe_cfg()` helper for the
      emotion model config.
- [ ] Multipart variant of the audio endpoints if we decide to upload
      bytes instead of passing paths (the current scaffold uses JSON
      `{audio_path}` because the C# backend and sidecar live on the
      same machine).
- [ ] Optional `POST /api/process-all` that chains diarize + gender +
      emotion + NER + cleanup + merge in a single request
      (PYTHON-SIDECAR-SPEC §4).
- [ ] Real fixtures: `tests/fixtures/short_audio.wav` (5 s) for the
      diarize/gender/emotion integration tests.

## Nice-to-have

- [ ] Structured logging (uvicorn access + app logs in JSON).
- [ ] Prometheus `/metrics` endpoint — only if the desktop app grows
      a telemetry story.

## Known non-issues (do not re-raise)

- Endpoints use JSON bodies with `audio_path` strings. This is the
  chosen contract per the scaffold brief and matches the
  single-machine deployment model (C# backend and sidecar share the
  file system).
- `.python-version` pins 3.11 because that is the macOS target; the
  scaffold was verified on 3.12 locally and is forward-compatible.
