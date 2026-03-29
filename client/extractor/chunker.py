from typing import List
from utils.logging import get_logger

logger = get_logger(__name__)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Splits text into overlapping chunks based on word count.

    Args:
        text: The full extracted text string.
        chunk_size: Maximum number of words per chunk.
        overlap: Number of words to overlap between consecutive chunks.

    Returns:
        List of text chunks (strings).

    Why word-based chunking:
        - Preserves semantic meaning better than character-based splitting
        - Aligns better with tokenization used in embedding models

    Overlap:
        Ensures continuity of context across chunk boundaries.
        Example:
            Chunk 1: words 0–499
            Chunk 2: words 450–949 (50-word overlap)
    """

    try:
        if not text or not text.strip():
            logger.warning("Received empty text for chunking.")
            return []

        # Normalize whitespace and split into words
        words = text.split()

        total_words = len(words)

        if total_words == 0:
            logger.warning("No valid words found after splitting.")
            return []

        # Safety: prevent invalid configs
        if chunk_size <= 0:
            raise ValueError("chunk_size must be greater than 0")
        if overlap >= chunk_size:
            raise ValueError("overlap must be smaller than chunk_size")

        chunks = []
        start = 0

        while start < total_words:
            end = start + chunk_size

            # Slice words safely
            chunk_words = words[start:end]

            # Join into string
            chunk = " ".join(chunk_words).strip()

            if chunk:
                chunks.append(chunk)

            # Move start forward with overlap
            start += (chunk_size - overlap)

        logger.info(
            f"Chunking complete: {len(chunks)} chunks created "
            f"from {total_words} words (chunk_size={chunk_size}, overlap={overlap})"
        )

        return chunks

    except Exception as e:
        logger.error(f"Error during chunking: {e}")
        return []