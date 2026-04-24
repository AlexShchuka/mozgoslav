# periodic aggregated summaries

Monthly and per-topic rollups built from the note corpus. Requires a scheduled job that groups notes by period or tag, runs an LLM merge pass, and emits a stable "summary note" that regenerates incrementally when new notes arrive.
