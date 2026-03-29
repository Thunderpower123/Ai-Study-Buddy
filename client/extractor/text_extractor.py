from utils.logging import get_logger

logger = get_logger(__name__)


def extract_text(file_bytes: bytes) -> str:
    """
    Extracts text from a plain text file (bytes).

    Handles the "paste raw text" feature — when a student types or pastes
    notes directly into the UI rather than uploading a file, the Node backend
    sends it as a UTF-8 encoded text/plain payload.

    Decoding strategy:
        1. Try UTF-8 first (most common)
        2. Fall back to latin-1 (never fails — covers legacy files)

    No chunking or processing happens here — just decode and return clean text.
    The chunker in the next step handles splitting.
    """

    try:
        if not file_bytes:
            logger.warning("Received empty bytes for text extraction.")
            return ""

        # Try UTF-8 first
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            logger.warning("UTF-8 decode failed — falling back to latin-1.")
            text = file_bytes.decode("latin-1")

        text = text.strip()

        if not text:
            logger.warning("Text file decoded but was empty after stripping.")
            return ""

        logger.info(f"Plain text extraction complete. Length: {len(text)} characters.")
        return text

    except Exception as e:
        logger.error(f"Error extracting plain text: {e}")
        return ""
