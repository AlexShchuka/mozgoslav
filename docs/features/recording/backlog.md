# recording — backlog

deferred items. each is one decision away from work.

- **gigaam-v3 RU STT.** SOTA RU ASR. Needs NeMo inference stack (not ggml). Holds for the WER gain vs current tier-2 whisper.
- **live streaming transcription.** Today file-only. Big pipeline rework; unclear value vs episodic recording.
- **quartz persistent job store.** Today durable job state lives in `processing_jobs` + rehydrator; Quartz uses RAM triggers. Swap only when multi-node scheduling or restart-without-rehydrator becomes a concrete need.
- **llm client resilience.** OpenAI SDK has its own HTTP pipeline and skips standard resilience. Full migration to raw HttpClient with the named `llm` resilience policy is a dedicated refactor.
