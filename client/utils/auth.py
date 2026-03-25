from fastapi import Request, HTTPException
from config.settings import settings


def verify_service_key(request: Request):
    """
    Called at the top of every route handler.

    Reads the x-service-key header from the incoming request and compares it
    to the SERVICE_KEY in our .env. If it doesn't match — or is missing — we
    immediately return 401 and stop processing.

    This ensures the Python client can only be called by our own Node backend.
    The frontend never gets this key. It is never exposed to the browser.

    Why a header and not a query param or body field:
    Headers are the standard place for auth tokens in service-to-service calls.
    They don't appear in URLs (no accidental logging), and they're separate from
    the request body (no schema changes needed to add auth).
    """
    key = request.headers.get("x-service-key")
    if not key or key != settings.SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid service key")
