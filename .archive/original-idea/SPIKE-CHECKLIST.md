# Pre-implementation Spikes — Checklist

**Цель:** проверить 3 критических интеграции перед тем как Claude начнёт писать код.
**Время:** ~20 минут суммарно.
**Где:** на маке user'а.

---

## Spike 1: Whisper.net + CoreML на Apple Silicon (5 мин)

```bash
mkdir ~/spike-whisper && cd ~/spike-whisper
dotnet new console
dotnet add package Whisper.net --version 1.9.0
dotnet add package Whisper.net.Runtime.CoreML --version 1.9.0
```

Заменить `Program.cs`:

```csharp
using Whisper.net;

var modelPath = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
    + "/Library/Application Support/com.mozgoslav.app/models/ggml-large-v3-q8_0.bin";

Console.WriteLine($"Model: {modelPath}");
Console.WriteLine($"Exists: {File.Exists(modelPath)}");

using var processor = WhisperProcessor.CreateBuilder()
    .WithModel(modelPath)
    .WithLanguage("ru")
    .WithBeamSize(5)
    .WithBestOf(5)
    .Build();

var wavPath = "test.wav";

Console.WriteLine("Transcribing...");
await foreach (var segment in processor.ProcessAsync(File.OpenRead(wavPath)))
{
    Console.WriteLine($"[{segment.Start:mm\\:ss} → {segment.End:mm\\:ss}] {segment.Text}");
}
Console.WriteLine("Done!");
```

```bash
# Подготовить тестовый WAV
ffmpeg -i ~/Documents/Obsidian\ Vault/audio/$(ls ~/Documents/Obsidian\ Vault/audio/ | head -1) \
  -ar 16000 -ac 1 -t 15 test.wav

# Запустить
dotnet run
```

### Что проверяем:

- [ ] `dotnet run` НЕ падает с ошибкой загрузки нативной библиотеки
- [ ] Выводит сегменты с русским текстом
- [ ] Время работы: < 30 сек на 15-секундном аудио (CoreML ускорение)

### Если упало:

- `DllNotFoundException` → CoreML runtime не подцепился. Попробовать без CoreML: убрать `Whisper.net.Runtime.CoreML`,
  добавить `Whisper.net.Runtime` (CPU).
- Модель не найдена → проверить путь.

---

## Spike 2: Electron + C# Backend → .dmg (10 мин)

```bash
mkdir ~/spike-electron && cd ~/spike-electron

# 1. Backend (minimal API)
dotnet new webapi -n backend --no-https
cd backend
# Добавить health endpoint
cat > Program.cs << 'EOF'
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));
var app = builder.Build();
app.UseCors();
app.MapGet("/api/health", () => new { status = "ok", time = DateTime.UtcNow });
app.MapGet("/api/recordings", () => new[] { new { id = "1", fileName = "test.m4a", status = "Done" } });
app.Run();
EOF

# Publish для macOS ARM
dotnet publish -c Release -r osx-arm64 --self-contained -p:PublishSingleFile=true
ls -la bin/Release/net9.0/osx-arm64/publish/backend
cd ..

# 2. Frontend (Electron + React)
npm create electron-vite@latest frontend -- --template react-ts
cd frontend
npm install

# 3. Прописать запуск backend в electron/main.ts
# (добавить spawn child process — см. FRONTEND-SPEC §3.2)

# 4. Dev mode
npm run dev
# → Окно открывается? API отвечает на http://localhost:5050/api/health?

# 5. Build .dmg
# Скопировать backend binary в resources/
mkdir -p resources/backend
cp ../backend/bin/Release/net9.0/osx-arm64/publish/backend resources/backend/

npx electron-builder --mac
ls dist/*.dmg
```

### Что проверяем:

- [ ] `dotnet publish` → single binary для osx-arm64
- [ ] `npm run dev` → Electron окно открывается
- [ ] C# backend стартует и отвечает на /api/health
- [ ] `electron-builder --mac` → .dmg файл
- [ ] Двойной клик по .dmg → приложение ставится и запускается

### Если упало:

- `electron-builder` ошибка → проверить electron-builder.yml, extraResources пути
- Backend не стартует → проверить `ASPNETCORE_URLS`, порт
- .dmg не открывается → code signing не нужен для dev, но может нужен `--mac --config.mac.identity=null`

---

## Spike 3: LM Studio JSON Structured Output (3 мин)

Открой LM Studio. Загрузи Qwen2.5-14B-Instruct (или что есть).

В чате или через curl:

```bash
curl -s http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "default",
    "temperature": 0.1,
    "max_tokens": 4096,
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "meeting_summary",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "summary": {"type": "string"},
            "key_points": {"type": "array", "items": {"type": "string"}},
            "decisions": {"type": "array", "items": {"type": "string"}},
            "action_items": {"type": "array", "items": {"type": "object", "properties": {"person": {"type": "string"}, "task": {"type": "string"}, "deadline": {"type": "string"}}, "required": ["person", "task"]}},
            "participants": {"type": "array", "items": {"type": "string"}},
            "topic": {"type": "string"},
            "conversation_type": {"type": "string", "enum": ["meeting", "one_on_one", "idea", "personal", "other"]},
            "tags": {"type": "array", "items": {"type": "string"}}
          },
          "required": ["summary", "key_points", "participants", "topic", "conversation_type", "tags"]
        }
      }
    },
    "messages": [
      {"role": "system", "content": "Ты ассистент для обработки записей рабочих встреч. Язык: русский. Выкидывай small talk. Верни структурированный JSON."},
      {"role": "user", "content": "Ну привет, как дела? Слушай, давай обсудим релиз. Значит, Иван берёт на себя фронтенд, Ольга делает бэкенд. Дедлайн — пятница. Ещё надо решить, кто будет ревьюить. Ну вот, в общем, такой план."}
    ]
  }' | python3 -m json.tool
```

### Что проверяем:

- [ ] Ответ — валидный JSON (python3 -m json.tool не падает)
- [ ] `summary` содержит суть (релиз, распределение задач)
- [ ] `participants` содержит ["Иван", "Ольга"]
- [ ] `action_items` содержит задачи с person/task
- [ ] `conversation_type` = "meeting"
- [ ] Повторить 3 раза — все 3 раза валидный JSON

### Если упало:

- LM Studio не поддерживает `json_schema` → попробовать `"type": "json_object"` (без schema)
- Модель генерирует markdown вокруг JSON → добавить в system prompt: "Верни ТОЛЬКО JSON, без markdown-обёртки"
- JSON невалидный → добавить retry + JSON repair в BACKEND-SPEC

---

## Итог

| Spike              | Прошёл? | Действие если нет                                       |
|--------------------|---------|---------------------------------------------------------|
| Whisper.net CoreML | ☐       | Fallback: Whisper.net CPU (без CoreML пакета)           |
| Electron + C# .dmg | ☐       | Попробовать Electron.NET вместо manual child process    |
| LM Studio JSON     | ☐       | Добавить `"type": "json_object"` fallback + JSON repair |

**Все три прошли → Claude берёт спеки и пишет код.**
**Один не прошёл → обновить соответствующую спеку, потом писать.**
