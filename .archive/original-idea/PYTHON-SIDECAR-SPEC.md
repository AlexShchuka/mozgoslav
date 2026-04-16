# Mozgoslav for Conversations — Python ML Sidecar Specification

**По рабочему коду из консольного MVP (bash+Python)**

---

## 1. Роль в архитектуре

Python sidecar — отдельный HTTP-сервер, запускаемый C# backend при старте приложения. Отвечает за ML-задачи, которых нет в .NET экосистеме.

```
Electron → C# Backend (localhost:5050) → Python Sidecar (localhost:5060)
```

**MVP:** Python sidecar НЕ нужен. Транскрибация (Whisper.net) и LLM (LM Studio) работают из C#.
**V3:** Python подключается для diarization, gender, emotion, NER.

---

## 2. Что делает

| Задача | Модель | Вход | Выход |
|---|---|---|---|
| Diarization | Silero VAD + Resemblyzer + sklearn | WAV 16kHz | `[{start, end, speaker_id}]` |
| Gender | audeering/wav2vec2-large-robust-24-ft-age-gender | WAV 16kHz + speaker segments | `{speaker_id: "М"/"Ж"}` |
| Emotion | audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim | WAV 16kHz (speech only) | `"нейтральный"/"радостный"/...` |
| NER | Natasha | текст (string) | `{people[], orgs[], locs[], dates[]}` |
| Filler cleanup | regex | текст (string) | очищенный текст |

---

## 3. Project Structure

```
python-sidecar/
├── app/
│   ├── __init__.py
│   ├── main.py                    ← FastAPI app, endpoints
│   ├── config.py                  ← настройки, пути к моделям
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── diarize.py             ← Silero VAD + Resemblyzer + AgglomerativeClustering
│   │   ├── gender.py              ← audeering age-gender
│   │   ├── emotion.py             ← audeering emotion-dim
│   │   ├── ner.py                 ← Natasha
│   │   └── filler.py              ← regex filler cleanup
│   │
│   ├── models/                    ← Pydantic schemas (request/response)
│   │   ├── __init__.py
│   │   ├── diarize.py
│   │   ├── enrich.py
│   │   └── common.py
│   │
│   └── ml/                        ← загрузка и кэширование ML-моделей
│       ├── __init__.py
│       ├── loader.py              ← lazy loading всех моделей
│       └── patches.py             ← workarounds (vocab_size=None fix и т.п.)
│
├── tests/
│   ├── __init__.py
│   ├── test_diarize.py
│   ├── test_ner.py
│   ├── test_filler.py
│   └── fixtures/
│       └── short_audio.wav        ← 5-сек тестовый аудио
│
├── requirements.txt
├── pyproject.toml
└── Dockerfile                     ← опционально, для изоляции
```

---

## 4. API Endpoints (FastAPI)

```python
# app/main.py
from fastapi import FastAPI, UploadFile, File
from app.models.diarize import DiarizeRequest, DiarizeResponse
from app.models.enrich import EnrichRequest, EnrichResponse

app = FastAPI(title="Mozgoslav ML Sidecar", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/diarize", response_model=DiarizeResponse)
async def diarize(file: UploadFile = File(...),
                  min_speakers: int | None = None,
                  max_speakers: int | None = None):
    """VAD + speaker embeddings + clustering → speaker segments"""

@app.post("/api/gender", response_model=GenderResponse)
async def classify_gender(file: UploadFile = File(...),
                          segments: list[SpeakerSegment] = ...):
    """Per-speaker gender classification (М/Ж)"""

@app.post("/api/emotion", response_model=EmotionResponse)
async def classify_emotion(file: UploadFile = File(...),
                           segments: list[SpeakerSegment] = ...):
    """Dominant emotion for the recording"""

@app.post("/api/ner", response_model=NerResponse)
async def extract_entities(text: str):
    """Natasha NER: people, orgs, locs, dates"""

@app.post("/api/cleanup", response_model=CleanupResponse)
async def cleanup_fillers(text: str, level: str = "light"):
    """Regex filler removal"""

@app.post("/api/process-all", response_model=FullProcessingResponse)
async def process_all(file: UploadFile = File(...),
                      transcript_json: str = ...,
                      min_speakers: int | None = None,
                      max_speakers: int | None = None):
    """Всё сразу: diarize + gender + emotion + NER + cleanup + merge"""
```

### Request/Response Models (Pydantic)

```python
# app/models/diarize.py
from pydantic import BaseModel

class SpeakerSegment(BaseModel):
    start: float       # секунды
    end: float
    speaker_id: str    # "SPEAKER_00", "SPEAKER_01"

class DiarizeResponse(BaseModel):
    segments: list[SpeakerSegment]
    num_speakers: int

# app/models/enrich.py
class GenderResponse(BaseModel):
    genders: dict[str, str]   # {"Speaker 1": "М", "Speaker 2": "Ж"}

class EmotionResponse(BaseModel):
    label: str                # "нейтральный", "радостный", ...
    arousal: float
    valence: float

class NerResponse(BaseModel):
    people: list[str]
    orgs: list[str]
    locs: list[str]
    dates: list[str]

class CleanupResponse(BaseModel):
    text: str

class FullProcessingResponse(BaseModel):
    diarize: DiarizeResponse
    genders: dict[str, str]
    emotion: EmotionResponse
    ner: NerResponse
    merged_segments: list[MergedSegment]

class MergedSegment(BaseModel):
    speaker: str       # "Speaker 1 (М)"
    text: str
    start: float
    end: float
```

---

## 5. ML Models (проверенные, из рабочего кода)

### 5.1 Diarization: Silero VAD + Resemblyzer + sklearn

```python
# app/services/diarize.py
import numpy as np
import torch
from silero_vad import load_silero_vad, get_speech_timestamps
from resemblyzer import VoiceEncoder, preprocess_wav
from sklearn.cluster import AgglomerativeClustering

# Параметры VAD (проверены):
VAD_PARAMS = {
    "sampling_rate": 16000,
    "min_speech_duration_ms": 250,
    "min_silence_duration_ms": 100,
    "speech_pad_ms": 30,
}

# Параметры кластеризации:
CLUSTERING_DISTANCE_THRESHOLD = 0.75  # cosine distance
MIN_SEGMENT_DURATION = 0.7            # секунд, короче — не embedding'им

def diarize(audio: np.ndarray, sr: int = 16000,
            min_speakers: int | None = None,
            max_speakers: int | None = None) -> list[tuple[float, float, str]]:
    """
    Returns: [(start_sec, end_sec, "SPEAKER_00"), ...]
    
    Алгоритм:
    1. Silero VAD → speech timestamps
    2. Для каждого сегмента ≥ 0.7с: Resemblyzer → 256-dim embedding
    3. AgglomerativeClustering (cosine, threshold=0.75) → speaker labels
    4. Короткие сегменты < 0.7с → приклеиваются к ближайшему по времени
    5. Сортировка по времени
    """
```

### 5.2 Gender: audeering wav2vec2

```python
# app/services/gender.py
# Модель: audeering/wav2vec2-large-robust-24-ft-age-gender (~1.3 GB, public HF)
#
# Кастомная архитектура (head поверх Wav2Vec2Model):
#   - age: Linear(hidden_size, 1)
#   - gender: Linear(hidden_size, 3)  → 0=female, 1=male, 2=child
#
# Child → маппится как "Ж" (приближение)
# Majority vote по всем сегментам спикера
#
# ВАЖНО: Wav2Vec2Processor.from_pretrained() — ОК для этой модели (vocab.json есть)

class AgeGenderHead(nn.Module):
    def __init__(self, config, num_labels):
        super().__init__()
        self.dense = nn.Linear(config.hidden_size, config.hidden_size)
        self.dropout = nn.Dropout(config.final_dropout)
        self.out_proj = nn.Linear(config.hidden_size, num_labels)
    def forward(self, x):
        return self.out_proj(self.dropout(torch.tanh(self.dense(x))))

class AgeGenderModel(Wav2Vec2Model):
    def __init__(self, config):
        super().__init__(config)
        self.age = AgeGenderHead(config, 1)
        self.gender = AgeGenderHead(config, 3)
    def forward(self, input_values):
        hidden = super().forward(input_values)[0].mean(dim=1)
        return self.age(hidden), self.gender(hidden)
```

### 5.3 Emotion: audeering wav2vec2 dimensions

```python
# app/services/emotion.py
# Модель: audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim (~1.3 GB, public HF)
#
# Возвращает 3 dimensions: arousal, dominance, valence (0-1)
#
# ВАЖНО: vocab_size=None в config.json → ломает strict validation в новых huggingface_hub
# WORKAROUND: загрузить config.json вручную, пропатчить vocab_size=32, создать Wav2Vec2Config
# ВАЖНО: Wav2Vec2Processor.from_pretrained() падает → использовать AutoFeatureExtractor

# Маппинг dimensions → label:
def emotion_label(arousal: float, valence: float) -> str:
    if valence > 0.55 and arousal > 0.55: return "радостный"
    if valence > 0.55 and arousal < 0.45: return "спокойный"
    if valence < 0.45 and arousal > 0.55: return "раздражённый"
    if valence < 0.45 and arousal < 0.45: return "грустный"
    return "нейтральный"
```

### 5.4 NER: Natasha

```python
# app/services/ner.py
from natasha import Segmenter, MorphVocab, NewsEmbedding, NewsNERTagger, DatesExtractor, Doc

# Инициализация (один раз при старте):
segmenter = Segmenter()
morph_vocab = MorphVocab()
ner_tagger = NewsNERTagger(NewsEmbedding())
dates_extractor = DatesExtractor(morph_vocab)

def extract_entities(text: str) -> dict:
    doc = Doc(text)
    doc.segment(segmenter)
    doc.tag_ner(ner_tagger)
    
    people, orgs, locs = set(), set(), set()
    for span in doc.spans:
        span.normalize(morph_vocab)
        name = span.normal or span.text
        if span.type == "PER": people.add(name)
        elif span.type == "ORG": orgs.add(name)
        elif span.type == "LOC": locs.add(name)
    
    dates = set()
    for m in dates_extractor(text):
        parts = [str(x) for x in (m.fact.day, m.fact.month, m.fact.year) if x]
        if parts: dates.add(".".join(parts))
    
    return {
        "people": sorted(people),
        "orgs": sorted(orgs),
        "locs": sorted(locs),
        "dates": sorted(dates),
    }
```

### 5.5 Filler Cleanup

```python
# app/services/filler.py
import re

FILLERS = [
    "ну", "это", "типа", "короче", "вот", "блин", "значит",
    "как бы", "в общем", "в принципе", "так сказать",
    "эээ", "ээ", "эх", "мм", "ммм", "мммм", "эм", "ээм",
]

def cleanup(text: str, level: str = "light") -> str:
    if level == "none":
        return text
    
    t = text
    for w in FILLERS:
        t = re.sub(rf"(?ui)\b{re.escape(w)}\b[,\s]*", "", t)
    
    # Дубли подряд идущих слов
    t = re.sub(r"(?ui)\b(\w+)\s+\1\b", r"\1", t)
    
    # Нормализация пробелов и пунктуации
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\s*,\s*,", ",", t)
    t = re.sub(r"\s+([,.!?])", r"\1", t)
    
    return t.strip()
```

---

## 6. ML Model Loader (lazy, cached)

```python
# app/ml/loader.py
import torch
from functools import lru_cache

@lru_cache(maxsize=1)
def get_vad_model():
    from silero_vad import load_silero_vad
    return load_silero_vad()

@lru_cache(maxsize=1)
def get_voice_encoder():
    from resemblyzer import VoiceEncoder
    return VoiceEncoder(verbose=False)

@lru_cache(maxsize=1)
def get_age_gender_model():
    """~1.3 GB, загрузка при первом вызове"""
    from transformers import Wav2Vec2Processor, AutoConfig
    AG_ID = "audeering/wav2vec2-large-robust-24-ft-age-gender"
    processor = Wav2Vec2Processor.from_pretrained(AG_ID)
    config = AutoConfig.from_pretrained(AG_ID)
    model = AgeGenderModel.from_pretrained(AG_ID, config=config)
    model.eval()
    return processor, model

@lru_cache(maxsize=1)
def get_emotion_model():
    """~1.3 GB, загрузка при первом вызове.
    WORKAROUND: vocab_size=None → patch через _safe_cfg()"""
    from transformers import AutoFeatureExtractor
    EM_ID = "audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim"
    processor = AutoFeatureExtractor.from_pretrained(EM_ID)
    config = _safe_cfg(EM_ID)  # patches.py
    model = EmotionModel.from_pretrained(EM_ID, config=config)
    model.eval()
    return processor, model

@lru_cache(maxsize=1)
def get_ner():
    from natasha import Segmenter, MorphVocab, NewsEmbedding, NewsNERTagger, DatesExtractor
    seg = Segmenter()
    mv = MorphVocab()
    nt = NewsNERTagger(NewsEmbedding())
    de = DatesExtractor(mv)
    return seg, mv, nt, de
```

---

## 7. Known Workarounds (из боевого опыта)

### 7.1 transformers + stdin → FileNotFoundError

**Проблема:** `transformers >=4.50` делает `inspect.getsource()` кастомных классов моделей. Если Python запущен через `python3 - <<HEREDOC`, исходник = `<stdin>`, файл не найден → crash.

**Решение:** всегда записывать Python-код в **временный .py файл** и запускать его, не через stdin. В sidecar-сервере проблемы нет (FastAPI = обычный .py файл).

### 7.2 audeering emotion: vocab_size=None

**Проблема:** `audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim` имеет `vocab_size=None` в config.json. Новый `huggingface_hub` (strict dataclass validation) падает на `setattr`.

**Решение:**
```python
# app/ml/patches.py
from huggingface_hub import hf_hub_download
from transformers import Wav2Vec2Config
import json

def _safe_cfg(model_id: str) -> Wav2Vec2Config:
    cfg_path = hf_hub_download(model_id, "config.json")
    d = json.load(open(cfg_path))
    if d.get("vocab_size") in (None, 0):
        d["vocab_size"] = 32  # dummy, модель не использует tokenizer
    return Wav2Vec2Config(**d)
```

### 7.3 audeering emotion: Wav2Vec2Processor → FeatureExtractor

**Проблема:** `Wav2Vec2Processor.from_pretrained()` ожидает tokenizer (vocab.json). У emotion-модели его нет.

**Решение:** использовать `AutoFeatureExtractor.from_pretrained()` вместо `Wav2Vec2Processor`.

### 7.4 Resemblyzer: короткие сегменты

**Проблема:** `VoiceEncoder.embed_utterance()` даёт мусорные embeddings на сегментах < 0.7 сек.

**Решение:** сегменты < 0.7 сек пропускаются, потом приклеиваются к ближайшему по времени спикеру (majority vote по temporal proximity).

---

## 8. Dependencies

```
# requirements.txt
fastapi>=0.115.0
uvicorn>=0.32.0
python-multipart>=0.0.9

# ML
torch>=2.4.0
torchaudio>=2.4.0
transformers>=4.44.0
huggingface_hub>=0.25.0
soundfile>=0.12.0
librosa>=0.10.0
numpy>=1.26.0

# Diarization
silero-vad>=5.1
resemblyzer>=0.1.4
scikit-learn>=1.5.0

# NER
natasha>=1.6.0
```

**Размер venv:** ~3-4 GB (torch + transformers доминируют)
**Модели в HF cache:** ~3 GB (audeering ×2 + Silero VAD + Resemblyzer bundled)
**Всего на диске:** ~6-7 GB

**Все модели PUBLIC на HuggingFace, без gating, без токена.**

---

## 9. Запуск

### Dev
```bash
cd python-sidecar
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload
```

### Production (через C# backend)
C# `BackendProcess` при старте Electron:
```csharp
var pythonPath = Path.Combine(resourcesPath, "python-sidecar", "venv", "bin", "python3");
var mainPy = Path.Combine(resourcesPath, "python-sidecar", "app", "main.py");
Process.Start(pythonPath, $"-m uvicorn app.main:app --host 127.0.0.1 --port 5060");
```

### Health check
```
GET http://localhost:5060/health → {"status": "ok"}
```

C# backend перед вызовом проверяет health. Если Python не запущен → graceful skip (diarize/gender/emotion/NER не выполняются, возвращается только whisper transcript).

---

## 10. C# → Python Communication

```csharp
// Mozgoslav.Infrastructure/Services/PythonSidecarClient.cs
public class PythonSidecarClient
{
    private readonly HttpClient _http;
    private const string BaseUrl = "http://localhost:5060";

    public async Task<bool> IsAvailableAsync(CancellationToken ct)
    {
        try { var r = await _http.GetAsync($"{BaseUrl}/health", ct); return r.IsSuccessStatusCode; }
        catch { return false; }
    }

    public async Task<DiarizeResult> DiarizeAsync(string wavPath, int? minSpeakers, int? maxSpeakers, CancellationToken ct)
    {
        using var form = new MultipartFormDataContent();
        form.Add(new StreamContent(File.OpenRead(wavPath)), "file", Path.GetFileName(wavPath));
        if (minSpeakers.HasValue) form.Add(new StringContent(minSpeakers.Value.ToString()), "min_speakers");
        if (maxSpeakers.HasValue) form.Add(new StringContent(maxSpeakers.Value.ToString()), "max_speakers");
        var response = await _http.PostAsync($"{BaseUrl}/api/diarize", form, ct);
        return await response.Content.ReadFromJsonAsync<DiarizeResult>(ct);
    }

    public async Task<NerResult> ExtractEntitiesAsync(string text, CancellationToken ct)
    {
        var response = await _http.PostAsJsonAsync($"{BaseUrl}/api/ner", new { text }, ct);
        return await response.Content.ReadFromJsonAsync<NerResult>(ct);
    }

    // аналогично для gender, emotion, cleanup, process-all
}
```

---

## 11. Testing

```python
# tests/test_filler.py
from app.services.filler import cleanup

def test_removes_basic_fillers():
    assert cleanup("ну вот типа привет") == "привет"

def test_removes_duplicate_words():
    assert cleanup("привет привет мир") == "привет мир"

def test_preserves_clean_text():
    assert cleanup("всё хорошо работает") == "всё хорошо работает"

def test_none_level_preserves_all():
    assert cleanup("ну вот типа привет", level="none") == "ну вот типа привет"


# tests/test_ner.py
from app.services.ner import extract_entities

def test_extracts_person():
    result = extract_entities("Иван сказал что проект готов")
    assert "Иван" in result["people"]

def test_extracts_org():
    result = extract_entities("Мы работаем в компании")
    assert any("компания" in o for o in result["orgs"])


# tests/test_diarize.py (integration, нужен fixtures/short_audio.wav)
import numpy as np
from app.services.diarize import diarize

def test_single_speaker_returns_one():
    # mono sine wave = 1 speaker
    audio = np.sin(np.linspace(0, 100, 16000 * 3)).astype(np.float32)
    segments = diarize(audio, sr=16000)
    speakers = set(s[2] for s in segments)
    assert len(speakers) == 1
```

---

## 12. Key Decisions

1. **FastAPI, не Flask** — async, auto-docs (/docs), Pydantic validation, modern Python
2. **Lazy model loading** — модели грузятся при первом запросе, не при старте (экономим RAM если не используется)
3. **`/api/process-all` endpoint** — один вызов для всего pipeline (меньше HTTP overhead, C# делает один POST)
4. **Resemblyzer, не pyannote** — все pyannote модели gated на HF, Resemblyzer без регистрации
5. **audeering workarounds вшиты** — vocab_size patch, FeatureExtractor вместо Processor
6. **Graceful degradation** — если sidecar не запущен, C# возвращает transcript без enrichment
7. **venv рядом или в Application Support** — не в системном Python, изолированный
