from pydantic import BaseModel
from typing import Optional, List


class Source(BaseModel):
    """
    A single source citation — which file and where in it.
    Pulled from Pinecone vector metadata at query time.
    Displayed in the chat UI under each AI answer.
    """
    filename: str    # e.g. "chapter3.pdf"
    section: str     # e.g. "Page 12" or "Slide 4"


class UserProfile(BaseModel):
    """
    Academic profile of the student, sent by Node with every query.

    Node fetches the UserProfile from MongoDB and attaches it to the
    /query request body. The prompt builder injects it into the GPT
    system prompt so answers are tailored to the student's level.

    Example: A 2nd year EE student asking about Fleming's rule gets an
    explanation at circuit level. A 4th year CS student gets a more
    abstract treatment. NotebookLM cannot do this — it treats every
    user identically.

    All fields are Optional — not every student will have filled their profile.
    If None, the prompt builder skips personalization and answers generically.
    """
    branch: Optional[str] = None          # e.g. "Electrical Engineering"
    year: Optional[int] = None            # 1, 2, 3, or 4
    university: Optional[str] = None
    interests: Optional[List[str]] = []   # e.g. ["circuits", "machines"]
    domains: Optional[List[str]] = []     # e.g. ["Backend", "Computer Vision"]
    bio: Optional[str] = None


class QueryRequest(BaseModel):
    """
    Shape of the body Node sends to POST /query.

    question: The student's message from the chat UI.
    sessionId: Which session to search vectors in (Pinecone namespace).
    userProfile: Academic context injected into the GPT system prompt.
        Optional — works fine without it, just not personalized.
    """
    question: str
    sessionId: str
    userProfile: Optional[UserProfile] = None


class QueryResponse(BaseModel):
    """
    What we send back to Node after answering a question.

    answer: The GPT-generated response text.
    mode: "grounded" or "extended"
        Grounded = answered strictly from uploaded documents.
        Extended = detected that the student wants deeper explanation,
        so GPT supplemented with general knowledge beyond the notes.
        Node saves this in the Message MongoDB record.
    sources: List of Source citations shown under the answer in the UI.
    confidence: "high", "medium", or "low"
        Derived from Pinecone similarity scores. High = the retrieved
        chunks closely matched the question. Low = weak match, answer
        may be less reliable. Shown as a badge in the chat UI.
    """
    success: bool
    answer: str
    mode: str
    sources: List[Source]
    confidence: str
