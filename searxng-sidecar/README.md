# searxng-sidecar

Self-hosted SearXNG meta-search aggregator for Mozgoslav. AGPL-3.0.

## Bootstrap

```bash
cd searxng-sidecar
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Note: `requirements.txt` pins `searxng==2025.4.8`. The upstream SearXNG project does not publish to PyPI under a date-versioned scheme. Install directly from the upstream repository if the pinned version is unavailable:

```bash
pip install git+https://github.com/searxng/searxng.git
```

## Running

```bash
bash launch.sh
```

On first launch, copies `settings.yml` to `~/Library/Application Support/Mozgoslav/searxng/settings.yml`.
Subsequent launches read from that user-editable copy. Settings path is passed via `SEARXNG_SETTINGS_PATH`.

## Health check

```
GET http://127.0.0.1:8888/healthz
```

Returns `200 OK` when SearXNG is ready.

## Search API

```
GET http://127.0.0.1:8888/search?q=<query>&format=json
```

## Configuration

Edit `~/Library/Application Support/Mozgoslav/searxng/settings.yml`.
The upstream engines (DuckDuckGo, Yandex, Google) can be toggled via the Settings → Web Search UI.

## Privacy

SearXNG anonymizes your IP when relaying queries to upstream search engines.
Your raw queries reach whichever upstream engines are enabled in the config.
