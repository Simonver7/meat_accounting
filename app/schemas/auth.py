from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    """Вход по JSON (удобно с телефона)."""

    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=100)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeOut(BaseModel):
    id: int
    username: str
    display_name: str


class ProfileUpdateIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=100)
    username: str | None = Field(default=None, min_length=1, max_length=50)
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    new_password: str | None = Field(default=None, min_length=8, max_length=100)
