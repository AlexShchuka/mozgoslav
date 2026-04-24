# LLM model picker from provider API

Replace the free-text model input on the settings screen with a dropdown populated from the configured LLM provider's catalogue (`GET /v1/models` on LM Studio / Ollama / any OpenAI-compatible endpoint). Backend proxies the call so the renderer never reaches the provider directly. Reload on endpoint change; graceful empty-state when the endpoint is unreachable.
