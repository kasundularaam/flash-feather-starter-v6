from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    auth_provider: str
    role: str
    profile_picture: Optional[str] = None


class AuthResponse(BaseModel):
    message: str
    user: UserResponse
