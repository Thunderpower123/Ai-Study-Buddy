import fitz  # PyMuPDF
from io import BytesIO
from utils.logging import get_logger

logger = get_logger(__name__)


def extract_pdf(file_bytes: bytes) -> str:
    """
    Extracts text from a PDF file (bytes) using PyMuPDF.

    - Reads PDF from memory (no disk I/O)
    - Extracts text page by page
    - Prefixes each page with: --- Page N ---
    - Skips empty pages
    - Joins all pages with double newlines

    NOTE:
    Symbol corruption (α, β, ω → ?) is expected here and will be fixed later
    via Groq post-processing.
    """

    try:
        # Load PDF from memory
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        pages = []

        for i, page in enumerate(doc, start=1):
            text = page.get_text().strip()

            if not text:
                continue  # skip empty pages

            page_block = f"--- Page {i} ---\n{text}"
            pages.append(page_block)

        doc.close()

        if not pages:
            logger.warning("PDF extraction completed but no text found.")
            return ""

        return "\n\n".join(pages)

    except Exception as e:
        logger.error(f"Error extracting PDF: {e}")
        return ""