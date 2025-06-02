import jwt
import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from app.database import get_db
from app.models import User


class AuthService:
    JWT_SECRET = os.getenv("JWT_SECRET", "default_secret_change_in_production")
    ACCESS_TOKEN_EXPIRE_SECONDS = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_SECONDS", "900"))  # 15 minutes
    REFRESH_TOKEN_EXPIRE_SECONDS = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_SECONDS", "604800"))  # 7 days
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    @classmethod
    def create_tokens(cls, user_id: int) -> dict:
        """Create access and refresh tokens"""
        access_token = jwt.encode({
            "sub": str(user_id),
            "exp": datetime.now(timezone.utc) + timedelta(seconds=cls.ACCESS_TOKEN_EXPIRE_SECONDS)
        }, cls.JWT_SECRET, algorithm="HS256")

        refresh_token = jwt.encode({
            "sub": str(user_id),
            "exp": datetime.now(timezone.utc) + timedelta(seconds=cls.REFRESH_TOKEN_EXPIRE_SECONDS)
        }, cls.JWT_SECRET, algorithm="HS256")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    @classmethod
    async def validate_and_refresh_token(cls, access_token: str, refresh_token: str = None, from_cookie: bool = False):
        """Validate token and refresh if needed"""
        try:
            # Try to decode access token
            payload = jwt.decode(
                access_token, cls.JWT_SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])

            # Get user from database
            db = next(get_db())
            user = db.query(User).filter(User.id == user_id).first()
            db.close()

            if user:
                return {"user": user}

        except jwt.ExpiredSignatureError:
            # Token expired, try to refresh if from cookie
            if from_cookie and refresh_token:
                return await cls.refresh_access_token(refresh_token)
        except jwt.InvalidTokenError:
            pass

        return None

    @classmethod
    async def refresh_access_token(cls, refresh_token: str):
        """Create new access token using refresh token"""
        try:
            payload = jwt.decode(
                refresh_token, cls.JWT_SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])

            # Get user from database
            db = next(get_db())
            user = db.query(User).filter(User.id == user_id).first()
            db.close()

            if user:
                new_tokens = cls.create_tokens(user_id)
                return {
                    "user": user,
                    "new_access_token": new_tokens["access_token"],
                    "new_refresh_token": new_tokens["refresh_token"]
                }
        except jwt.InvalidTokenError:
            pass

        return None
