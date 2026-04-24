# structured corpus queries

Natural-language queries against the note corpus with structured answers: "what was discussed with X in the last month", "which action items repeat across notes". Today `rag/query` returns fuzzy hits only. Needs a query planner that maps intents to filters + aggregations over note metadata before falling back to vector recall.
