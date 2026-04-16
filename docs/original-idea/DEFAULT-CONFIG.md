# Mozgoslav — Default Configuration & Package Versions

**Все дефолты приложения. При первом запуске — всё работает из коробки.**
**Обновлено: 2026-04-16**

---

## 1. Дефолтные модели (русский язык)

### STT (Speech-to-Text)
| Параметр | Значение | Почему |
|---|---|---|
| Модель | **ggml-large-v3-q8_0.bin** | Лучший баланс качество/размер для русского. Квантизация q8_0 ≈ без потерь. |
| Размер | ~1.5 GB | |
| Скачать | https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q8_0.bin | |
| Путь по умолчанию | `~/Library/Application Support/Mozgoslav/models/ggml-large-v3-q8_0.bin` | |
| CoreML companion | Нужен `ggml-large-v3-q8_0-encoder.mlmodelc` рядом для GPU-ускорения | |

### STT Parameters (проверены в бою)
```
language:         ru
beam_size:        5
best_of:          5
max_context:      0       ← каждый сегмент независимо, против галлюцинаций
suppress_nst:     true    ← подавление non-speech tokens
threads:          14      ← Apple Silicon M3/M4 (auto-detect в приложении)
```

### STT Prompt (дефолт, пользователь может менять в Profile)
```
Мысли вслух, встречи, диалоги, рассуждения.
```

### VAD (Voice Activity Detection)
| Параметр | Значение |
|---|---|
| Модель | **Silero VAD v6.2.0** (ggml binary) |
| Размер | ~4 MB |
| Скачать | https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin |
| Путь | `~/Library/Application Support/Mozgoslav/models/ggml-silero-v6.2.0.bin` |

### LLM (для суммаризации и semantic processing)
| Параметр | Значение | Почему |
|---|---|---|
| Рекомендуемая модель | **Qwen2.5-14B-Instruct-Q4_K_M** | Лучший русский среди local 14B. На M3 36GB — быстро. |
| Альтернатива (легче) | **Qwen2.5-7B-Instruct-Q4_K_M** | Если RAM не хватает |
| Альтернатива (мощнее) | **Qwen3.5-27B-Q4_K_M** | Если RAM позволяет (нужно ~17 GB) |
| Endpoint | `http://localhost:1234` (LM Studio) или `http://localhost:11434` (Ollama) |
| API | OpenAI-compatible `/v1/chat/completions` |
| Temperature | 0.1 |
| Max tokens | 4096 |
| Response format | `json_schema` (structured output) |

### Diarization (V3, не MVP)
| Компонент | Модель |
|---|---|
| VAD | Silero VAD (pip `silero-vad>=5.1`) |
| Embeddings | Resemblyzer (`pip resemblyzer>=0.1.4`, ~25 MB, bundled) |
| Clustering | sklearn `AgglomerativeClustering(distance_threshold=0.75, metric='cosine')` |

### Gender (V3)
| Параметр | Значение |
|---|---|
| Модель | `audeering/wav2vec2-large-robust-24-ft-age-gender` |
| Размер | ~1.3 GB |
| HF gated | **Нет** (public) |

### Emotion (V3)
| Параметр | Значение |
|---|---|
| Модель | `audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim` |
| Размер | ~1.3 GB |
| HF gated | **Нет** (public) |
| **Workaround** | `vocab_size=None` → patch через `_safe_cfg()` (см. PYTHON-SIDECAR-SPEC §7.2) |
| **Workaround** | `Wav2Vec2Processor` → `AutoFeatureExtractor` (см. §7.3) |

### NER
| Параметр | Значение |
|---|---|
| Библиотека | Natasha (`pip natasha>=1.6.0`) |
| Размер | ~300 MB |
| Языки | Русский (only) |
| Entities | PER, ORG, LOC, DATE |

---

## 2. NuGet пакеты (C# backend) — latest stable

```xml
<!-- Directory.Packages.props -->
<ItemGroup>
  <!-- Core -->
  <PackageVersion Include="Whisper.net" Version="1.9.0" />
  <PackageVersion Include="Whisper.net.Runtime.CoreML" Version="1.9.0" />
  <PackageVersion Include="OpenAI" Version="2.2.0" />
  <PackageVersion Include="Microsoft.Data.Sqlite" Version="9.0.4" />
  <PackageVersion Include="Dapper" Version="2.1.66" />
  
  <!-- ASP.NET -->
  <PackageVersion Include="Microsoft.AspNetCore.App" Version="9.0.*" />
  
  <!-- Audio -->
  <!-- ffmpeg через subprocess, не NuGet -->
  
  <!-- Testing -->
  <PackageVersion Include="xunit" Version="2.9.3" />
  <PackageVersion Include="xunit.runner.visualstudio" Version="2.8.2" />
  <PackageVersion Include="NSubstitute" Version="5.3.0" />
  <PackageVersion Include="FluentAssertions" Version="7.2.0" />
  <PackageVersion Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
</ItemGroup>
```

## 3. npm пакеты (frontend) — latest stable

```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.5.0",
    "react-redux": "^9.2.0",
    "redux": "^5.0.1",
    "redux-saga": "^1.3.0",
    "reselect": "^5.1.1",
    "immer": "^10.1.1",
    "styled-components": "^6.1.14",
    "axios": "^1.7.9",
    "classnames": "^2.5.1",
    "date-fns": "^4.1.0",
    "react-dropzone": "^14.3.8",
    "react-markdown": "^9.1.0",
    "remark-gfm": "^4.0.0",
    "react-toastify": "^11.0.5",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "electron": "^33.4.0",
    "electron-builder": "^25.1.8",
    "vite": "^6.3.2",
    "vite-plugin-electron": "^0.30.0",
    "@vitejs/plugin-react": "^4.4.1",
    "typescript": "^5.7.3",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@types/styled-components": "^5.1.34",
    "@types/uuid": "^10.0.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "redux-saga-test-plan": "^4.0.6",
    "eslint": "^9.24.0",
    "prettier": "^3.5.3",
    "plop": "^4.0.1"
  }
}
```

## 4. Python пакеты (sidecar, V3)

```
# requirements.txt
fastapi>=0.115.0
uvicorn>=0.32.0
python-multipart>=0.0.18

torch>=2.6.0
torchaudio>=2.6.0
transformers>=4.49.0
huggingface_hub>=0.29.0
soundfile>=0.13.0
librosa>=0.10.2
numpy>=2.2.0

silero-vad>=5.1.2
resemblyzer>=0.1.4
scikit-learn>=1.6.1

natasha>=1.6.0
```

## 5. Paths (macOS defaults)

```
App data:        ~/Library/Application Support/Mozgoslav/
Models:          ~/Library/Application Support/Mozgoslav/models/
Database:        ~/Library/Application Support/Mozgoslav/secondbrain.db
Config:          ~/Library/Application Support/Mozgoslav/config.json
Logs:            ~/Library/Application Support/Mozgoslav/logs/
Temp audio:      ~/Library/Application Support/Mozgoslav/temp/

Default vault:   ~/Documents/Obsidian Vault/
Export folder:   _inbox/

LM Studio:       http://localhost:1234
Ollama:          http://localhost:11434
Backend:         http://localhost:5050
Python sidecar:  http://localhost:5060 (V3)
```

## 6. Дефолтные профили обработки (seed data)

### Рабочий (isDefault=true)
```json
{
  "name": "Рабочий",
  "cleanupLevel": "Aggressive",
  "exportFolder": "_inbox",
  "autoTags": ["meeting", "work"],
  "systemPrompt": "Ты ассистент для обработки записей рабочих встреч.\nЯзык ответа: русский.\nНа входе — расшифровка разговора.\nВыкидывай small talk, шутки, болтовню.\nВерни JSON:\n{\n  \"summary\": \"краткое изложение (3-5 предложений)\",\n  \"key_points\": [\"тезис 1\", ...],\n  \"decisions\": [\"решение 1\", ...],\n  \"action_items\": [{\"person\": \"Имя\", \"task\": \"Что\", \"deadline\": \"Когда\"}],\n  \"unresolved_questions\": [\"вопрос 1\", ...],\n  \"participants\": [\"Имя 1\", ...],\n  \"topic\": \"тема\",\n  \"conversation_type\": \"meeting\",\n  \"tags\": [\"tag1\", ...]\n}"
}
```

### Неформальный
```json
{
  "name": "Неформальный",
  "cleanupLevel": "Light",
  "exportFolder": "_inbox",
  "autoTags": ["personal"],
  "systemPrompt": "Ты ассистент. Обработай запись неформального разговора.\nЯзык: русский.\nСохрани общий смысл, контекст, шутки как шутки.\nНЕ делай сухой протокол.\nВерни JSON:\n{\"summary\": \"...\", \"key_points\": [...], \"participants\": [...], \"topic\": \"...\", \"conversation_type\": \"personal\", \"tags\": [...]}"
}
```

### Полная заметка
```json
{
  "name": "Полная заметка",
  "cleanupLevel": "None",
  "exportFolder": "_inbox",
  "autoTags": ["full"],
  "systemPrompt": "Обработай запись разговора. Сохрани ВСЁ.\nЯзык: русский.\nВерни JSON:\n{\"summary\": \"...\", \"key_points\": [...], \"decisions\": [...], \"action_items\": [...], \"unresolved_questions\": [...], \"participants\": [...], \"topic\": \"...\", \"conversation_type\": \"...\", \"tags\": [...]}"
}
```

## 7. Filler словарь (русский)

```
ну, это, типа, короче, вот, блин, значит,
как бы, в общем, в принципе, так сказать,
эээ, ээ, эх, мм, ммм, мммм, эм, ээм
```

Aggressive level дополнительно: `ну вот`, `ну это`, `ну типа`, `вот это`, `ну короче`

## 8. Model Download URLs (для UI "скачать модель")

```json
{
  "models": [
    {
      "id": "whisper-large-v3-q8",
      "name": "Whisper Large v3 (Q8, рекомендуемая)",
      "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q8_0.bin",
      "size_mb": 1500,
      "type": "stt",
      "default": true
    },
    {
      "id": "whisper-large-v3-turbo",
      "name": "Whisper Large v3 Turbo (быстрее, чуть хуже)",
      "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q8_0.bin",
      "size_mb": 874,
      "type": "stt",
      "default": false
    },
    {
      "id": "whisper-medium",
      "name": "Whisper Medium (лёгкая, для слабых машин)",
      "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q8_0.bin",
      "size_mb": 500,
      "type": "stt",
      "default": false
    },
    {
      "id": "silero-vad",
      "name": "Silero VAD v6.2.0",
      "url": "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin",
      "size_mb": 4,
      "type": "vad",
      "default": true
    }
  ]
}
```
