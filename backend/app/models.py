from pydantic import BaseModel, ConfigDict, Field, field_validator

class FAQ(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{1,39}$")
    question: str = Field(min_length=5, max_length=240)
    answer: str = Field(min_length=5, max_length=3000)
    alternatives: list[str] = Field(default_factory=list, max_length=8)
    category: str = Field(min_length=3, max_length=70)

    @field_validator('alternatives')
    @classmethod
    def check_alternatives(cls, values: list[str]) -> list[str]:
        stripped = [s.strip() for s in values]
        if any(not s or len(s) > 240 for s in stripped):
            raise ValueError('Alternative questions must be 1–240 characters')
        if len({s.casefold() for s in stripped}) != len(stripped):
            raise ValueError('Duplicate alternative phrasings')
        return stripped

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    @field_validator('question')
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Question cannot be blank')
        return value.strip()

class ChatResponse(BaseModel):
    question: str
    answer: str
    faq_id: str | None
    category: str | None
    relevance: float | None
    status: str
    fallback: bool
    suggestions: list[str] = Field(default_factory=list)

class FAQCollection(BaseModel):
    faqs: list[FAQ]
    count: int
