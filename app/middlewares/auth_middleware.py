from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.services.auth_service.auth_service import AuthService


class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, **kwargs):
        super().__init__(app, **kwargs)

    async def dispatch(self, request: Request, call_next):
        # Skip auth middleware for logout endpoint
        if request.url.path == "/api/auth/logout":
            return await call_next(request)

        # Initialize user state
        request.state.user = None

        # Get tokens from cookies or headers
        access_token = request.cookies.get(
            "access_token") or self.get_header_token(request)
        refresh_token = request.cookies.get("refresh_token")

        user_data = None

        # Try with access token first (if it exists)
        if access_token:
            user_data = await AuthService.validate_and_refresh_token(
                access_token, refresh_token, from_cookie=bool(
                    request.cookies.get("access_token"))
            )

        # If access token is None/invalid but we have refresh token, try refresh-only
        elif refresh_token:
            user_data = await AuthService.refresh_access_token(refresh_token)

        if user_data:
            request.state.user = user_data.get("user")
            # Set new tokens in response if refreshed
            if user_data.get("new_access_token"):
                response = await call_next(request)
                # Use centralized cookie setting method
                new_tokens = {
                    "access_token": user_data["new_access_token"],
                    "refresh_token": user_data["new_refresh_token"]
                }
                AuthService.set_auth_cookies(response, new_tokens)
                return response

        return await call_next(request)

    def get_header_token(self, request: Request) -> str:
        auth_header = request.headers.get("Authorization", "")
        return auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
