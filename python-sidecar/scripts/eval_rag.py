from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from pathlib import Path

FIXTURES = Path(__file__).parent / "eval-fixtures"
CORPUS_PATH = FIXTURES / "corpus.jsonl"
QUERIES_PATH = FIXTURES / "queries.jsonl"
BASELINE_PATH = FIXTURES / "baseline.json"


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def bm25_scores(
    query_tokens: list[str],
    corpus: list[dict],
    k1: float = 1.5,
    b: float = 0.75,
) -> dict[str, float]:
    doc_texts = [c["text"].lower().split() for c in corpus]
    avg_dl = sum(len(d) for d in doc_texts) / max(len(doc_texts), 1)
    df: dict[str, int] = defaultdict(int)
    for tokens in doc_texts:
        for t in set(tokens):
            df[t] += 1
    n = len(corpus)
    scores: dict[str, float] = {}
    for doc, tokens in zip(corpus, doc_texts):
        score = 0.0
        tf_map: dict[str, int] = defaultdict(int)
        for t in tokens:
            tf_map[t] += 1
        dl = len(tokens)
        for qt in query_tokens:
            tf = tf_map.get(qt, 0)
            idf = math.log((n - df[qt] + 0.5) / (df[qt] + 0.5) + 1)
            tf_norm = tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl / avg_dl))
            score += idf * tf_norm
        scores[doc["id"]] = score
    return scores


def bow_embed(text: str, dim: int = 64) -> list[float]:
    tokens = text.lower().split()
    vec = [0.0] * dim
    for t in tokens:
        idx = hash(t) % dim
        vec[idx] += 1.0
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def hybrid_retrieve(query: str, corpus: list[dict], top_k: int = 20) -> list[str]:
    query_tokens = query.lower().split()
    bm25 = bm25_scores(query_tokens, corpus)
    q_vec = bow_embed(query)
    embed_sc: dict[str, float] = {c["id"]: cosine(q_vec, bow_embed(c["text"])) for c in corpus}
    bm25_max = max(bm25.values()) or 1.0
    embed_max = max(embed_sc.values()) or 1.0
    hybrid: dict[str, float] = {
        cid: 0.5 * bm25[cid] / bm25_max + 0.5 * embed_sc[cid] / embed_max
        for cid in bm25
    }
    ranked = sorted(hybrid, key=lambda cid: hybrid[cid], reverse=True)
    return ranked[:top_k]


def ndcg_at_k(ranked: list[str], rels: dict[str, int], k: int = 5) -> float:
    dcg = sum(
        rels.get(cid, 0) / math.log2(i + 2)
        for i, cid in enumerate(ranked[:k])
    )
    ideal_rels = sorted(rels.values(), reverse=True)[:k]
    idcg = sum(
        r / math.log2(i + 2)
        for i, r in enumerate(ideal_rels)
    )
    return dcg / idcg if idcg > 0 else 0.0


def mrr(ranked: list[str], rels: dict[str, int]) -> float:
    for i, cid in enumerate(ranked):
        if rels.get(cid, 0) > 0:
            return 1.0 / (i + 1)
    return 0.0


def recall_at_k(ranked: list[str], rels: dict[str, int], k: int = 10) -> float:
    relevant = {cid for cid, r in rels.items() if r > 0}
    if not relevant:
        return 1.0
    hits = len(relevant & set(ranked[:k]))
    return hits / len(relevant)


def main() -> int:
    corpus = load_jsonl(CORPUS_PATH)
    queries = load_jsonl(QUERIES_PATH)
    baseline = json.loads(BASELINE_PATH.read_text())

    ndcg_scores: list[float] = []
    mrr_scores: list[float] = []
    recall_scores: list[float] = []

    for q in queries:
        ranked = hybrid_retrieve(q["query"], corpus)
        rels = q["rels"]
        ndcg_scores.append(ndcg_at_k(ranked, rels))
        mrr_scores.append(mrr(ranked, rels))
        recall_scores.append(recall_at_k(ranked, rels))

    avg_ndcg = sum(ndcg_scores) / len(ndcg_scores)
    avg_mrr = sum(mrr_scores) / len(mrr_scores)
    avg_recall = sum(recall_scores) / len(recall_scores)

    print(f"NDCG@5  : {avg_ndcg:.4f}  (min {baseline['ndcg@5_min']})")
    print(f"MRR     : {avg_mrr:.4f}  (min {baseline['mrr_min']})")
    print(f"R@10    : {avg_recall:.4f}  (min {baseline['recall@10_min']})")

    passed = (
        avg_ndcg >= baseline["ndcg@5_min"]
        and avg_mrr >= baseline["mrr_min"]
        and avg_recall >= baseline["recall@10_min"]
    )

    if passed:
        print("PASS")
        return 0

    print("FAIL — one or more metrics below baseline thresholds")
    return 1


if __name__ == "__main__":
    sys.exit(main())
