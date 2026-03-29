import numpy as np


def cosine_similarity(a, b):
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return np.dot(a, b) / (norm_a * norm_b)


def mmr_select(query_vec, candidates, lambda_param=0.5, top_k=5):
    """
    Maximal Marginal Relevance selection.

    Balances relevance to the query with diversity among selected chunks.
    lambda_param=0.5 weights relevance and diversity equally.

    candidates = [{text, vector, score, ...}]
    """

    selected = []
    selected_indices = set()  # track by index to avoid identity comparison bugs on dicts
    candidate_vecs = [c["vector"] for c in candidates]

    while len(selected) < min(top_k, len(candidates)):
        best_score = -float("inf")
        best_idx = -1

        for i, candidate in enumerate(candidates):
            if i in selected_indices:
                continue

            # Use pre-scored relevance if available, else compute cosine
            relevance = candidate.get("score") if candidate.get("score") is not None \
                else cosine_similarity(query_vec, candidate_vecs[i])

            # Max similarity to already-selected chunks (diversity penalty)
            diversity = 0.0
            for s in selected:
                sim = cosine_similarity(candidate_vecs[i], s["vector"])
                if sim > diversity:
                    diversity = sim

            score = lambda_param * relevance - (1 - lambda_param) * diversity

            if score > best_score:
                best_score = score
                best_idx = i

        # Guard: if no valid candidate found, stop early
        if best_idx == -1:
            break

        selected_indices.add(best_idx)
        selected.append(candidates[best_idx])

    return selected