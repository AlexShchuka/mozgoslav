# Obsidian Vault Bootstrap

Готовая структура для копирования в Obsidian vault.

## Установка

1. Скачай эту папку целиком.
2. **Содержимое** (не саму папку!) скопируй в корень своего Obsidian vault. Папки `_inbox`, `_system`, `ideas` etc. должны лежать в корне vault на одном уровне с `.obsidian/`.

```bash
# с Mac, в терминале:
cp -R obsidian-vault-bootstrap/* "/Users/aleksandr/Documents/Obsidian Vault/"
cp obsidian-vault-bootstrap/.gitkeep_marker_skip 2>/dev/null  # (нет, проигнорируй)
```

(Если файл `corrections.md` уже есть в vault — заменится. Если нет — создастся.)

## Что внутри

```
_inbox/              # сюда падают сырые расшифровки + спонтанные мысли
archive/             # отработанные оригиналы (script сам сюда переносит)
ideas/               # атомарные идеи (script создаёт)
insights/            # инсайты (script создаёт)
people/              # один файл на человека (script создаёт)
questions/           # открытые вопросы (script создаёт)
tasks/               # задачи (script создаёт)
_system/
  corrections.md     # словарь voice-to-text правок (поддерживай руками)
  flagged.md         # автодополняется непонятными словами
  prompts/
    split-and-label-prompt.md   # системный промпт LLM
  scripts/
    split_and_label.js          # JS-логика для Templater
  templates/
    split-and-label.md          # тонкий template, дёргает скрипт
```

## Настройка Templater

`Settings → Community plugins → Templater (settings)`:

| Поле | Значение |
|---|---|
| Template Folder Location | `_system/templates` |
| User Scripts Folder Location | `_system/scripts` |
| Trigger Templater on new file creation | OFF |
| Enable User Function loading | ON |

**После сохранения — выкл/вкл Templater** в Community plugins, чтобы JS-скрипт подхватился.

## Хоткей

`Settings → Templater → Hotkeys` или общий `Settings → Hotkeys`:

- Найди команду `Templater: split-and-label`
- Назначь хоткей (например `⌘⌥S`)

## LM Studio prerequisites

- Local Server running на `http://localhost:1234/v1`
- **Enable CORS** включён в server settings (иначе Obsidian fetch блокируется)
- Загружена чат-модель — по дефолту в `_system/scripts/split_and_label.js` указан `qwen3.5-27b-claude-4.6-opus-reasoning-distilled-v2`. Если у тебя другая — поменяй в `CONFIG.MODEL_NAME` в начале скрипта.
- Context length модели ≥ 32k для длинных расшифровок

## Использование

1. Открой любой файл из `_inbox/` (например `test.md`)
2. Нажми хоткей
3. Жди нотификацию (5-30 сек)
4. Проверяй: появились файлы в `ideas/`, `insights/` etc. Оригинал **остаётся в `_inbox/`** — после ревью созданных файлов перенеси его в `archive/` руками.

## Если что-то не работает

См. секцию «Если не работает» в `today-session-results/projects/split-and-label-README.md` (старший README с диагностикой типичных ошибок).
