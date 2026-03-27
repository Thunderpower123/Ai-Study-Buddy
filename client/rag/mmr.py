import numpy as np


def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def mmr_select(query_vec, candidates, lambda_param=0.5, top_k=5):
    """
    candidates = [{text, vector, score, ...}]
    """

    selected = []
    candidate_vecs = [c["vector"] for c in candidates]

    while len(selected) < min(top_k, len(candidates)):
        best_score = -1
        best_idx = -1

        for i, candidate in enumerate(candidates):
            if candidate in selected:
                continue

            # Use pre-scored relevance if available, else compute cosine
            relevance = candidate.get("score") if candidate.get("score") is not None \
                else cosine_similarity(query_vec, candidate_vecs[i])

            diversity = 0
            for s in selected:
                diversity = max(
                    diversity,
                    cosine_similarity(candidate_vecs[i], s["vector"])
                )

            score = lambda_param * relevance - (1 - lambda_param) * diversity

            if score > best_score:
                best_score = score
                best_idx = i

        selected.append(candidates[best_idx])

    return selected