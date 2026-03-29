import logging


def get_logger(name: str) -> logging.Logger:
    """
    Returns a logger with a consistent structured format.

    Format:
    [timestamp] LEVEL logger_name — message

    Example:
    [2026-03-25 22:10:12,345] INFO rag.ingest — Started ingestion

    Usage:
        logger = get_logger(__name__)
        logger.info("Something happened")
    """

    logger = logging.getLogger(name)

    # Prevent adding multiple handlers if logger already configured
    if not logger.handlers:
        logger.setLevel(logging.INFO)

        handler = logging.StreamHandler()

        formatter = logging.Formatter(
            "[%(asctime)s] %(levelname)s %(name)s — %(message)s"
        )

        handler.setFormatter(formatter)
        logger.addHandler(handler)

        # Avoid duplicate logs from parent/root logger
        logger.propagate = False

    return logger