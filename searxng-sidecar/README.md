# searxng-sidecar

Self-hosted SearXNG meta-search aggregator for Mozgoslav. AGPL-3.0.

## Bootstrap

```bash
cd searxng-sidecar
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Running

```bash
bash launch.sh
```

On first launch, copies `settings.yml` to `~/Library/Application Support/Mozgoslav/searxng/settings.yml`.
Subsequent launches read from that user-editable copy.

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
