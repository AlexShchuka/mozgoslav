# RAG eval runbook

Offline eval harness that measures NDCG@5, MRR, and Recall@10 on a curated synthetic corpus.

## Run locally

```bash
bash scripts/eval-rag.sh
```

The script activates the python-sidecar venv if present, then runs
`python-sidecar/scripts/eval_rag.py`. Exit 0 = all metrics pass; exit 1 = regression.

## What it measures

| Metric | Description |
|--------|-------------|
| NDCG@5 | Graded relevance quality of the top-5 results |
| MRR | Reciprocal rank of the first relevant result |
| Recall@10 | Fraction of relevant chunks found in top-10 |

Thresholds live in `python-sidecar/scripts/eval-fixtures/baseline.json`.

## Update baseline thresholds

After a deliberate improvement to retrieval quality, update the thresholds:

1. Run `bash scripts/eval-rag.sh` to see the new numbers.
2. Edit `python-sidecar/scripts/eval-fixtures/baseline.json` with the new minimums.
3. Commit both the code change and the updated baseline in the same PR.

Do not raise thresholds without a corresponding retrieval improvement — the gate
detects regressions, not absolute quality.

## When CI eval fails

1. Check whether you changed `backend/src/Mozgoslav.Infrastructure/Rag/**` or
   `python-sidecar/app/services/rerank_service.py`.
2. Run the harness locally to reproduce.
3. If the regression is intentional (algorithm change), update baseline per the
   section above.
4. If unexpected, bisect by reverting the retrieval change and re-running.

## Add or edit corpus / queries

Fixtures live in `python-sidecar/scripts/eval-fixtures/`:

- `corpus.jsonl` — one chunk per line: `{"id": "c1", "text": "..."}`.
- `queries.jsonl` — one query per line: `{"qid": "q1", "query": "...", "rels": {"c1": 3, ...}}`.
  Relevance grades are 0 (not relevant) to 3 (highly relevant).

After editing fixtures, re-run the harness and update `baseline.json` if needed.
