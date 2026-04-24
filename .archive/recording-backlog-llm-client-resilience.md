# llm client resilience

The OpenAI-compatible provider uses the SDK and its own HTTP pipeline, so the standard resilience policy does not attach. A full migration to raw HttpClient with the named `llm` resilience policy is a dedicated refactor.
