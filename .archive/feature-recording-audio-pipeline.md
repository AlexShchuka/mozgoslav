# Audio Sidecar Analysis — Why Gender/Emotion/Speaker Data Never Reaches Notes

## TL;DR

`IPythonSidecarClient` is **registered in DI** but **never injected or called** by any processing pipeline. The Tier-2 models (gender, emotion) are stubs until models are fetched. NER exists as an interface with no caller. Result: zero sidecar data flows into notes.

---

## 1. Sidecar client — exists and registered, never used

### Registration point
`backend/src/Mozgoslav.Api/Program.cs:240`
```csharp
builder.Services.AddSingleton<IPythonSidecarClient>(sp =>
    new PythonSidecarClient(...));
```

### Implementation
`PythonSidecarClient.cs` — thin HTTP client for 4 endpoints:

| Method | Sidecar endpoint | Returns | Real? |
|--------|------------------|---------|-------|
| `DiarizeAsync` | `/api/diarize` | `SidecarDiarizeResult(Segments, NumSpeakers)` | ✅ real (pyannote) |
| `GenderAsync`  | `/api/gender`    | `SidecarGenderResult(Gender, Confidence)` | ⚠️ stub until model fetched |
| `EmotionAsync` | `/api/emotion`   | `SidecarEmotionResult(Emotion, Valence, Arousal, Dominance)` | ⚠️ stub until model fetched |
| `NerAsync`     | `/api/ner`       | `SidecarNerResult(People, Orgs, Locations, Dates)` | ✅ real (spaCy) |

### Usage in codebase: **ZERO**
Grep across the entire repo for each method returns **no call sites**. The client is wired into DI but nobody asks for it.

---

## 2. Processing pipeline — no sidecar calls

`ProcessQueueWorker.RunPipelineAsync()` (lines 144–228):

```
Transcription ✅ → Correction ✅ → LLM Summarization ✅ → Markdown export ✅
```

None of these steps injects or consumes `IPythonSidecarClient`. The pipeline builds a `ProcessedNote` via `BuildNote()` and passes it to `MarkdownGenerator.Generate()`:

```csharp
var note = BuildNote(transcript, profile, recording, cleanText, llmResult, version);
note.MarkdownContent = MarkdownGenerator.Generate(note, profile, recording, transcript.Segments);
```

`ProcessedNote` entity has **no fields** for sidecar data (gender, emotion, diarize segments, NER entities). The note is built entirely from LLM output and Whisper.net transcription.

---

## 3. What DOES work today — Whisper.net diarization

Speaker labels come from **Whisper.net's built-in Diarize API**, not the Python sidecar:
- `TranscriptSegment.SpeakerLabel` populated by Whisper.net during transcription (`ProcessQueueWorker.cs:159`)
- `MarkdownGenerator.AppendSpeakerGroupedTranscript()` groups transcript blocks by speaker label, rendering them as `**Alice (mm:ss):**\n text\n\n`
- This gives you **who said what** in the transcript section, but no metadata about speakers

---

## 4. Frontend note display

The frontend renders notes from markdown content exported to Obsidian vault via `MarkdownGenerator.Generate()`. There is no separate speaker card or metadata panel — everything lives in the markdown body. The only speaker-related rendering is the grouped transcript sections with timestamps.

---

## 5. Root cause summary

```
IPythonSidecarClient (DI registered)
    └── NO CALLER exists anywhere
        ├── ProcessQueueWorker — constructor has no IPythonSidecarClient dependency
        │   └── BuildNote() creates note with LLM fields only
        │   └── MarkdownGenerator.Generate() receives: note, profile, recording, transcriptSegments
        │       └── Only uses transcript.Segments[].SpeakerLabel (from Whisper.net)
        ├── ReprocessUseCase — same pattern, no sidecar injection
        └── ExportToMd endpoint — just reads existing note markdown content
```

**The pipeline was designed to rely on LLM for participant extraction and Whisper.net Diarize API for speaker identification. The Python-sidecar Tier-2 endpoints (gender/emotion) were never integrated into the processing flow.**

---

## 6. What's needed to fix this

### Option A: Sidecar-driven enhancement (recommended)

1. **Add fields to `ProcessedNote`** — e.g.:
   ```csharp
   public List<SidecarSpeakerInfo>? SpeakerProfiles { get; set; } // diarize + gender + emotion per speaker
   public List<string> NamedEntities { get; set; } = [];         // NER: people, orgs, locations, dates
   ```

2. **Inject `IPythonSidecarClient` into `ProcessQueueWorker`** and call it after transcription:
   ```csharp
   var diarize = await _sidecar.DiarizeAsync(wavPath, ct);
   // Group diarize segments by speaker → run gender on representative audio chunks
   var emotionResult = await _sidecar.EmotionAsync(wavPath, ct);
   var nerResult = await _sidecar.NerAsync(cleanText, ct);
   ```

3. **Enrich `BuildNote()`** with sidecar data alongside LLM data.

4. **Update `MarkdownGenerator.Generate()`** to render a speaker/emotion summary block in the note header:
   ```markdown
   ## Участники разговора
   
   | Имя (из Whisper) | Пол     | Тон беседы          |
   |------------------|---------|---------------------|
   | Alice            | female  | 😊 happy/engaged    |
   | Bob              | male    | 😐 neutral/calm     |
   
   ## Ключевые факты
   
   - **Люди:** Иван Петров, Мария Сидорова
   - **Организации:** Сбер, Яндекс
   - **Места:** Москва, Санкт-Петербург
   ```

### Option B: LLM-driven (alternative)

Use the existing `ILlmService` to extract speaker metadata from the transcript. This works but is slower and less structured than dedicated ML models.

---

## 7. Python sidecar stub status

From `python-sidecar/`:
- `/api/diarize` — **real** (pyannote/speaker-diarization-3.1)
- `/api/gender` — **stub** (dummy payload until model fetched)
- `/api/emotion` — **stub** (dummy payload until model fetched)  
- `/api/ner` — **real** (spaCy NER pipeline)

Gender and emotion models need to be downloaded first. The `SidecarModelUnavailableException` handles this gracefully with a "download via Settings → Models" hint, so the system will degrade rather than crash when stubs are hit.
