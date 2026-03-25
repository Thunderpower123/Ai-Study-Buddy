from pydantic import BaseModel


class QueryRequest(BaseModel):
    question: str
    sessionId: str


class QueryResponse(BaseModel):
    success: bool
    answer: str
    mode: str  # "grounded" or "extended" — tells frontend which mode was used
