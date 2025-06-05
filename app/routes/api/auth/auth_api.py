# app/routes/api/auth_api.py

import os
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, AuthProvider, Role
from app.services.auth_service.auth_service import AuthService
from app.services.auth_service.google_auth_service import GoogleAuthService
from .auth_schemas import RegisterRequest, LoginRequest, UserResponse, AuthResponse

router = APIRouter(prefix="/api/auth")


@router.get("/me", response_model=UserResponse)
async def get_current_user(request: Request):
    """Get current authenticated user - auth middleware injects user into request"""
    if not hasattr(request.state, 'user') or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return UserResponse.model_validate(request.state.user)


@router.post("/register", response_model=AuthResponse)
async def register(user_data: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    # Check if user exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    hashed_password = AuthService.pwd_context.hash(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password,
        auth_provider=AuthProvider.LOCAL,
        role=Role.USER
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create tokens and set cookies - all in one clean call!
    AuthService.create_tokens_and_set_cookies(user.id, response)

    return AuthResponse(message="Registration successful", user=user)


@router.post("/login", response_model=AuthResponse)
async def login(login_data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    # Authenticate user
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not AuthService.pwd_context.verify(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create tokens and set cookies - much cleaner!
    AuthService.create_tokens_and_set_cookies(user.id, response)

    return AuthResponse(message="Login successful", user=user)


@router.get("/google")
async def google_auth(request: Request):
    """Initiate Google OAuth flow"""
    return await GoogleAuthService.get_authorization_url(request)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        user_info = await GoogleAuthService.handle_callback(request)

        # Check if user exists
        user = db.query(User).filter(User.email == user_info['email']).first()

        if not user:
            # Create new user
            user = User(
                name=user_info['name'],
                email=user_info['email'],
                hashed_password="",  # No password for Google users
                auth_provider=AuthProvider.GOOGLE,
                role=Role.USER,
                profile_picture=user_info.get('picture')
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update existing user's profile picture if needed
            if user_info.get('picture') and user.profile_picture != user_info['picture']:
                user.profile_picture = user_info['picture']
                db.commit()

        # Create redirect response and set auth cookies
        response = RedirectResponse(url="/", status_code=302)
        AuthService.create_tokens_and_set_cookies(user.id, response)

        return response

    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Google authentication failed: {str(e)}")


@router.post("/logout")
async def logout(response: Response):
    # Clean logout with centralized cookie clearing
    AuthService.clear_auth_cookies(response)
    return {"message": "Logout successful"}
