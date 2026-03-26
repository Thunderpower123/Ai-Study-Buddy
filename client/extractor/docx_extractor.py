from docx import Document
from io import BytesIO
from utils.logging import get_logger

logger = get_logger(__name__)


def extract_docx(file_bytes: bytes) -> str:
    """
    Extracts text from a DOCX file (bytes).

    - Loads document from memory
    - Extracts all non-empty paragraphs
    - Joins with newline characters

    NOTE:
    DOCX usually preserves symbols better than PDFs.
    """

    try:
        document = Document(BytesIO(file_bytes))

        paragraphs = []

        for para in document.paragraphs:
            text = para.text.strip()
            if text:
                paragraphs.append(text)

        if not paragraphs:
            logger.warning("DOCX extraction completed but no text found.")
            return ""

        return "\n".join(paragraphs)

    except Exception as e:
        logger.error(f"Error extracting DOCX: {e}")
        return ""