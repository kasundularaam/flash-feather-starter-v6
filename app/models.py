from sqlalchemy import Column, Integer, String, Boolean, Enum
from app.database import Base
import enum


class AuthProvider(enum.Enum):
    LOCAL = "local"
    GOOGLE = "google"


class Role(enum.Enum):
    USER = "user"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    auth_provider = Column(Enum(AuthProvider), default=AuthProvider.LOCAL)
    role = Column(Enum(Role), default=Role.USER)
    profile_picture = Column(String, nullable=True)
