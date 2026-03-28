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

    Node fetches UserProfile + StudentDetails from MongoDB and merges them
    into a single profile object before sending here. All fields are Optional
    — not every student will have filled their profile. The prompt builder
    injects whatever is present into the GPT system prompt.

    Fields from UserProfile model:
        branch, year, university, bio, interests, domains

    Fields from StudentDetails model (also sent by Node):
        education, stream, courseBranch
    """
    # From UserProfile
    branch: Optional[str] = None          # e.g. "Electrical Engineering"
    year: Optional[int] = None            # 1, 2, 3, or 4
    university: Optional[str] = None
    interests: Optional[List[str]] = []   # e.g. ["circuits", "machines"]
    domains: Optional[List[str]] = []     # e.g. ["Backend", "Computer Vision"]
    bio: Optional[str] = None
    # From StudentDetails — Node merges these in before sending
    education: Optional[str] = None       # e.g. "UG", "PG", "PhD"
    stream: Optional[str] = None          # e.g. "Engineering"
    courseBranch: Optional[str] = None    # e.g. "Computer Science"


class QueryRequest(BaseModel):
    """
    Shape of the body Node sends to POST /query.

    Node sends snake_case field names (session_id, user_profile).
    Pydantic's model_config with populate_by_name allows both camelCase
    and snake_case to be accepted so either format works.

    question: The student's message from the chat UI.
    sessionId / session_id: Which session to search vectors in (Pinecone namespace).
    userProfile / user_profile: Academic context injected into the GPT system prompt.
        Optional — works fine without it, just not personalized.
    """
    model_config = {"populate_by_name": True}

    question: str
    sessionId: Optional[str] = None
    session_id: Optional[str] = None  # Node sends this
    userProfile: Optional[UserProfile] = None
    user_profile: Optional[UserProfile] = None  # Node sends this

    def get_session_id(self) -> str:
        return self.sessionId or self.session_id or ""

    def get_user_profile(self) -> Optional[UserProfile]:
        return self.userProfile or self.user_profile


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
