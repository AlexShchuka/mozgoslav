# searxng-sidecar

Self-hosted SearXNG meta-search aggregator for Mozgoslav. AGPL-3.0.

## Bootstrap

```bash
cd searxng-sidecar
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

`requirements.txt` installs SearXNG directly from the upstream repository at a pinned commit (SearXNG does not publish stable releases to PyPI under a date-versioned scheme).

## Running

```bash
bash launch.sh
```

On first launch, copies `settings.yml` to `~/Library/Application Support/Mozgoslav/searxng/settings.yml`.
Subsequent launches read from that user-editable copy. Settings path is passed via `SEARXNG_SETTINGS_PATH`.

## Health check

```
GET http://127.0.0.1:8888/
```

Returns `200 OK` (SearXNG home page) when the service is ready. The Electron launcher polls this endpoint before marking the sidecar as healthy.

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
