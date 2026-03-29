from llm.groq_client import groq_chat


async def expand_query(question: str) -> list:
    """
    Generate 2 alternative query forms.
    """

    prompt = [
        {
            "role": "system",
            "content": (
                "Generate exactly 2 alternative search queries for better document retrieval. "
                "Return ONLY the queries, one per line. "
                "No numbering, no bullets, no preamble, no explanation."
            )
        },
        {
            "role": "user",
            "content": f"Question: {question}"
        }
    ]

    result = await groq_chat(prompt)

    queries = [question]

    if result:
        import re
        for line in result.split("\n"):
            # Strip numbering (1. 2.), bullets (- *), and whitespace
            cleaned = re.sub(r'^[\s\-*\d\.]+', '', line).strip()
            # Skip short/intro lines like "Here are 2 queries:"
            if cleaned and len(cleaned) > 15 and cleaned not in queries:
                queries.append(cleaned)

    return queries[:3]