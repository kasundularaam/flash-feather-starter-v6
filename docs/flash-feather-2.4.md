# Flash Feather 2.4

## 🚀 What is Flash Feather?

Flash Feather is a minimal, LLM-friendly web framework that combines Python FastAPI, Jinja2 templates, and Lit.js components. It's designed for building modern web applications with simplicity, security, and production readiness.

## 🎯 Core Philosophy

1. **Minimalism**: Keep it simple, avoid unnecessary abstractions
2. **Server-Side Control**: All authentication and redirections handled by server
3. **Environment-Aware**: Automatic development/production configuration
4. **Cookie-Based Auth**: Secure HTTP-only cookies with automatic token refresh
5. **LLM-Friendly**: Code patterns that work well with AI assistance
6. **Production Ready**: Built for CI/CD deployments with data persistence

## 🛠 Tech Stack

- **Backend**: Python FastAPI with Uvicorn/Gunicorn
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT with HTTP-only cookies + Google OAuth
- **Sessions**: Starlette SessionMiddleware (required for OAuth)
- **Templating**: Jinja2 (minimal structure only)
- **Frontend**: Lit.js components (without Shadow DOM)
- **Validation**: Pydantic with proper schema organization
- **File Storage**: Environment-aware upload handling

## 📁 Project Structure

```
flash-feather-starter/
├── app/
│   ├── main.py                     # FastAPI app with lifespan events
│   ├── database.py                 # Environment-aware database paths
│   ├── storage.py                  # Environment-aware file storage
│   ├── models.py                   # SQLAlchemy models with enums
│   ├── templates.py                # Jinja2 template configuration
│   ├── middlewares/
│   │   └── auth_middleware.py      # Token refresh middleware
│   ├── routes/
│   │   ├── web/                    # Web routes (HTML only)
│   │   │   └── main_web.py
│   │   └── api/                    # API routes with schemas
│   │       ├── auth_api.py         # Auth endpoints
│   │       └── auth/
│   │           └── auth_schemas.py # Pydantic schemas
│   ├── services/                   # Business logic services
│   │   ├── auth_service.py         # JWT handling & cookie management
│   │   └── google_auth_service.py  # OAuth implementation
│   └── templates/                  # Minimal Jinja2 templates
│       ├── base.html
│       ├── index.html
│       └── auth/
│           ├── login_page.html
│           └── register_page.html
├── static/                         # Frontend assets
│   └── js/components/
│       ├── global/
│       │   └── app_header.js       # Auth-aware header
│       └── auth/
│           ├── login_form.js
│           ├── register_form.js
│           └── google_signin_button.js
├── uploads/                        # User uploads (dev only)
├── database.db                     # SQLite database (dev only)
├── requirements.txt                # Python dependencies
├── .env                           # Environment configuration
└── .gitignore                     # Git ignore rules
```

## 🔧 Installation & Setup

### 1. Create Project Directory

```bash
mkdir flash-feather-starter
cd flash-feather-starter
```

### 2. Create Virtual Environment

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install fastapi uvicorn[standard] gunicorn sqlalchemy pydantic python-multipart jinja2 python-dotenv pyjwt passlib[bcrypt] authlib httpx itsdangerous
```

### 4. Generate requirements.txt

```bash
pip freeze > requirements.txt
```

### 5. Create Environment File

**`.env`**

```env
# Environment (development or production)
ENVIRONMENT=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
ACCESS_TOKEN_EXPIRE_SECONDS=60      # Short for testing
REFRESH_TOKEN_EXPIRE_SECONDS=300    # Short for testing

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here
```

## 💾 Core Application Files

### Main Application Entry Point

**`app/main.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from dotenv import load_dotenv
from starlette.middleware.sessions import SessionMiddleware

# Load environment variables from .env file
load_dotenv()

# Import routers
from app.routes.web.main_web import router as web_router
from app.routes.api.auth_api import router as auth_api_router

# Import database and storage functions
from app.database import init_db
from app.storage import init_storage, get_uploads_path

# Import middleware
from app.middlewares.auth_middleware import AuthMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown (if needed)

# Create FastAPI app with lifespan
app = FastAPI(title="Flash Feather App", version="2.4.0", lifespan=lifespan)

# Add SessionMiddleware FIRST (required for Google OAuth)
import os
SECRET_KEY = os.getenv("JWT_SECRET", "your_super_secret_jwt_key_change_in_production")
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Initialize directories first (before mounting)
init_storage()

# Add authentication middleware
app.add_middleware(AuthMiddleware)

# Configure static files (after directories are created)
app.mount("/static", StaticFiles(directory=Path(__file__).parent.parent / "static"), name="static")
app.mount("/uploads", StaticFiles(directory=get_uploads_path()), name="uploads")

# Include routers
app.include_router(web_router)
app.include_router(auth_api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

### Environment-Aware Database

**`app/database.py`**

```python
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLAlchemy Base - consumed by models.py
Base = declarative_base()

# Environment configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

def get_database_path() -> str:
    """Get database path based on environment"""
    if ENVIRONMENT == "production":
        # Production: database outside project directory
        return "/var/www/flash-feather-data/database.db"
    else:
        # Development: database in project root
        return str(Path(__file__).parent.parent / "database.db")

# Database configuration
DATABASE_URL = f"sqlite:///{get_database_path()}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
```

### Environment-Aware Storage

**`app/storage.py`**

```python
import os
from pathlib import Path
from fastapi import UploadFile
import shutil
from typing import Optional
import uuid

# Storage configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

def get_uploads_path() -> Path:
    """Get uploads directory path based on environment"""
    if ENVIRONMENT == "production":
        # Production: uploads outside project directory
        return Path("/var/www/flash-feather-data/uploads")
    else:
        # Development: uploads in project root
        return Path(__file__).parent.parent / "uploads"

def init_storage():
    """Initialize storage directories"""
    uploads_path = get_uploads_path()
    uploads_path.mkdir(parents=True, exist_ok=True)

    # Create subdirectories
    (uploads_path / "avatars").mkdir(exist_ok=True)
    (uploads_path / "temp").mkdir(exist_ok=True)

async def save_upload_file(file: UploadFile, subfolder: str = "temp") -> str:
    """Save uploaded file and return the file path"""
    uploads_path = get_uploads_path()
    subfolder_path = uploads_path / subfolder
    subfolder_path.mkdir(exist_ok=True)

    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = subfolder_path / unique_filename

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return relative path for URL
    return f"{subfolder}/{unique_filename}"

def delete_file(file_path: str) -> bool:
    """Delete file from uploads directory"""
    try:
        full_path = get_uploads_path() / file_path
        if full_path.exists():
            full_path.unlink()
            return True
        return False
    except Exception:
        return False

def get_file_url(file_path: str) -> str:
    """Get public URL for uploaded file"""
    return f"/uploads/{file_path}"
```

### Database Models with Enums

**`app/models.py`**

```python
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
```

### Template Configuration

**`app/templates.py`**

```python
from fastapi.templating import Jinja2Templates
from pathlib import Path

templates = Jinja2Templates(directory=Path(__file__).parent / "templates")
```

## 🔐 Authentication System

### Authentication Service

**`app/services/auth_service.py`**

```python
import jwt
import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi import Response
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
    def set_auth_cookies(cls, response: Response, tokens: dict) -> None:
        """Set authentication cookies on response"""
        # Set access token cookie
        response.set_cookie(
            "access_token",
            tokens["access_token"],
            httponly=True,
            samesite="lax",
            secure=True,  # Enable in production with HTTPS
            max_age=cls.ACCESS_TOKEN_EXPIRE_SECONDS
        )

        # Set refresh token cookie
        response.set_cookie(
            "refresh_token",
            tokens["refresh_token"],
            httponly=True,
            samesite="lax",
            secure=True,  # Enable in production with HTTPS
            max_age=cls.REFRESH_TOKEN_EXPIRE_SECONDS
        )

    @classmethod
    def clear_auth_cookies(cls, response: Response) -> None:
        """Clear authentication cookies"""
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

    @classmethod
    def create_tokens_and_set_cookies(cls, user_id: int, response: Response) -> dict:
        """Convenience method to create tokens and set cookies in one call"""
        tokens = cls.create_tokens(user_id)
        cls.set_auth_cookies(response, tokens)
        return tokens

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
```

### Google OAuth Service

**`app/services/google_auth_service.py`**

```python
import os
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from fastapi import Request

# Check for required environment variables
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

# OAuth configuration with proper setup
config_data = {
    'GOOGLE_CLIENT_ID': GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': GOOGLE_CLIENT_SECRET
}

config = Config(environ=config_data)
oauth = OAuth(config)

oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)


class GoogleAuthService:
    @staticmethod
    async def get_authorization_url(request: Request):
        """Get Google OAuth authorization URL"""
        # Create redirect URI - this must match what's in Google Console
        redirect_uri = request.url_for('google_callback')

        # Use proper authlib method
        return await oauth.google.authorize_redirect(request, redirect_uri)

    @staticmethod
    async def handle_callback(request: Request):
        """Handle Google OAuth callback"""
        try:
            # Get token from Google
            token = await oauth.google.authorize_access_token(request)

            # Get user info from token
            user_info = token.get('userinfo')

            if not user_info:
                raise Exception("Failed to get user info from Google")

            return {
                'email': user_info.get('email'),
                'name': user_info.get('name'),
                'picture': user_info.get('picture')
            }
        except Exception as e:
            raise Exception(f"Google OAuth callback failed: {str(e)}")
```

### Authentication Middleware

**`app/middlewares/auth_middleware.py`**

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.services.auth_service import AuthService


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
```

## 🌐 Routes

### Web Routes (HTML Only)

**`app/routes/web/main_web.py`**

```python
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from app.templates import templates

router = APIRouter()

@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    # Server controls redirection - if user authenticated, redirect home
    if hasattr(request.state, 'user') and request.state.user:
        return RedirectResponse(url="/", status_code=302)

    return templates.TemplateResponse(
        "auth/login_page.html",
        {"request": request}
    )

@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    # Server controls redirection - if user authenticated, redirect home
    if hasattr(request.state, 'user') and request.state.user:
        return RedirectResponse(url="/", status_code=302)

    return templates.TemplateResponse(
        "auth/register_page.html",
        {"request": request}
    )
```

### Authentication Schemas

**`app/routes/api/auth/auth_schemas.py`**

```python
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
```

### API Routes

**`app/routes/api/auth_api.py`**

```python
import os
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, AuthProvider, Role
from app.services.auth_service import AuthService
from app.services.google_auth_service import GoogleAuthService
from .auth.auth_schemas import RegisterRequest, LoginRequest, UserResponse, AuthResponse

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
```

## 🎨 Frontend Templates

### Base Template

**`app/templates/base.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{% block title %}Flash Feather App{% endblock %}</title>

    <!-- External resources -->
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
    />

    <!-- Base styles -->
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Roboto", sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
      }
      .auth-container {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .auth-container h1 {
        text-align: center;
        color: #333;
        margin-bottom: 2rem;
      }
      .divider {
        text-align: center;
        margin: 1.5rem 0;
        color: #666;
        position: relative;
      }
      .divider:before {
        content: "";
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #ddd;
        z-index: 1;
      }
      .divider span {
        background: white;
        padding: 0 1rem;
        position: relative;
        z-index: 2;
      }
    </style>

    <!-- Page-specific module imports -->
    <script type="module">
      {% block module_imports %}{% endblock %}
    </script>
  </head>
  <body>
    <main>{% block content %}{% endblock %}</main>

    {% block scripts %}{% endblock %}
  </body>
</html>
```

### Home Page Template

**`app/templates/index.html`**

```html
{% extends "base.html" %} {% block title %}Home - Flash Feather{% endblock %} {%
block module_imports %} import '/static/js/components/global/app_header.js?v=1';
{% endblock %} {% block content %}
<app-header></app-header>

<div class="container">
  <div class="hero">
    <h1>🚀 Welcome to Flash Feather!</h1>
    <p>
      A minimal, LLM-friendly web framework combining Python FastAPI, Jinja2
      templates, and Lit.js components.
    </p>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  .hero {
    text-align: center;
    color: white;
    padding: 4rem 0;
  }
  .hero h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }
  .hero p {
    font-size: 1.2rem;
    margin-bottom: 3rem;
    opacity: 0.9;
  }
  .btn {
    display: inline-block;
    padding: 1rem 2rem;
    margin: 0 0.5rem;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 500;
    transition: all 0.3s;
  }
  .btn.primary {
    background: #4caf50;
    color: white;
  }
  .btn.secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
  }
  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
</style>
{% endblock %}
```

### Authentication Templates

**`app/templates/auth/login_page.html`**

```html
{% extends "base.html" %} {% block title %}Login - Flash Feather{% endblock %}
{% block module_imports %} import '/static/js/components/auth/login_form.js';
import '/static/js/components/auth/google_signin_button.js'; {% endblock %} {%
block content %}
<div class="auth-container">
  <h1>Welcome Back</h1>
  <login-form></login-form>
  <div class="divider"><span>or</span></div>
  <google-signin-button></google-signin-button>

  <div class="auth-links">
    <p>Don't have an account? <a href="/register">Sign up here</a></p>
    <p><a href="/">← Back to Home</a></p>
  </div>
</div>

<style>
  .auth-links {
    text-align: center;
    margin-top: 2rem;
  }
  .auth-links p {
    margin: 0.5rem 0;
  }
  .auth-links a {
    color: #667eea;
    text-decoration: none;
  }
  .auth-links a:hover {
    text-decoration: underline;
  }
</style>
{% endblock %}
```

**`app/templates/auth/register_page.html`**

```html
{% extends "base.html" %} {% block title %}Register - Flash Feather{% endblock
%} {% block module_imports %} import
'/static/js/components/auth/register_form.js'; import
'/static/js/components/auth/google_signin_button.js'; {% endblock %} {% block
content %}
<div class="auth-container">
  <h1>Create Account</h1>
  <register-form></register-form>
  <div class="divider"><span>or</span></div>
  <google-signin-button></google-signin-button>

  <div class="auth-links">
    <p>Already have an account? <a href="/login">Sign in here</a></p>
    <p><a href="/">← Back to Home</a></p>
  </div>
</div>

<style>
  .auth-links {
    text-align: center;
    margin-top: 2rem;
  }
  .auth-links p {
    margin: 0.5rem 0;
  }
  .auth-links a {
    color: #667eea;
    text-decoration: none;
  }
  .auth-links a:hover {
    text-decoration: underline;
  }
</style>
{% endblock %}
```

## 🎨 Frontend Components (Lit.js)

### App Header Component

**`static/js/components/global/app_header.js`**

```javascript
import { LitElement, html } from "https://esm.run/lit";

class AppHeader extends LitElement {
  static get properties() {
    return {
      user: { type: Object },
      loading: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.user = null;
    this.loading = false;
  }

  // Disable Shadow DOM for global styles
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadCurrentUser();
  }

  async loadCurrentUser() {
    try {
      // Just ask the server for current user - auth middleware handles everything
      const response = await fetch("/api/auth/me");

      if (response.ok) {
        this.user = await response.json();
      }
      // If not authenticated, user stays null - no client-side logic needed
    } catch (error) {
      // Silently fail - server handles auth, not the client
      console.log("Not authenticated");
    }
  }

  async handleLogout() {
    this.loading = true;
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Let server handle the redirect by reloading page
        window.location.reload();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <header class="app-header">
        <div class="header-container">
          <div class="logo">
            <a href="/">
              <i class="fas fa-feather-alt"></i>
              Flash Feather
            </a>
          </div>

          <nav class="header-nav">
            ${this.user
              ? html`
                  <div class="user-menu">
                    <span class="user-name">Hello, ${this.user.name}!</span>
                    <button
                      class="logout-btn"
                      @click=${this.handleLogout}
                      ?disabled=${this.loading}
                    >
                      ${this.loading ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                `
              : html`
                  <div class="auth-links">
                    <a href="/login" class="nav-link">Login</a>
                    <a href="/register" class="nav-link register">Register</a>
                  </div>
                `}
          </nav>
        </div>
      </header>

      <style>
        .app-header {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo a {
          color: white;
          text-decoration: none;
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .logo i {
          color: #4caf50;
        }
        .user-menu {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .user-name {
          color: white;
          font-weight: 500;
        }
        .logout-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .logout-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
        }
        .logout-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-links {
          display: flex;
          gap: 1rem;
        }
        .nav-link {
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: all 0.3s;
        }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .nav-link.register {
          background: #4caf50;
          color: white;
        }
        .nav-link.register:hover {
          background: #45a049;
        }
      </style>
    `;
  }
}

customElements.define("app-header", AppHeader);
```

### Authentication Form Components

**`static/js/components/auth/login_form.js`**

```javascript
import { LitElement, html } from "https://esm.run/lit";

class LoginForm extends LitElement {
  static get properties() {
    return {
      loading: { type: Boolean },
      error: { type: String },
    };
  }

  constructor() {
    super();
    this.loading = false;
    this.error = "";
  }

  // Disable Shadow DOM for global styles
  createRenderRoot() {
    return this;
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.loading = true;
    this.error = "";

    const formData = new FormData(e.target);
    const loginData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        // Cookies are set automatically by the server
        window.location.href = "/";
      } else {
        const error = await response.json();
        this.error = error.detail || "Login failed";
      }
    } catch (err) {
      this.error = "Network error occurred";
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <form class="login-form" @submit=${this.handleSubmit}>
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="Enter your email"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="Enter your password"
          />
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : ""}

        <button type="submit" ?disabled=${this.loading}>
          ${this.loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <style>
        .login-form {
          width: 100%;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }
        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        .error {
          color: #e74c3c;
          margin: 1rem 0;
          padding: 0.75rem;
          background: #fdf2f2;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        button {
          width: 100%;
          padding: 0.75rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        button:hover:not(:disabled) {
          background: #5a6fd8;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      </style>
    `;
  }
}

customElements.define("login-form", LoginForm);
```

**`static/js/components/auth/register_form.js`**

```javascript
import { LitElement, html } from "https://esm.run/lit";

class RegisterForm extends LitElement {
  static get properties() {
    return {
      loading: { type: Boolean },
      error: { type: String },
    };
  }

  constructor() {
    super();
    this.loading = false;
    this.error = "";
  }

  // Disable Shadow DOM for global styles
  createRenderRoot() {
    return this;
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.loading = true;
    this.error = "";

    const formData = new FormData(e.target);
    const registerData = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    // Basic validation
    if (registerData.password.length < 6) {
      this.error = "Password must be at least 6 characters long";
      this.loading = false;
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });

      if (response.ok) {
        // Cookies are set automatically by the server
        window.location.href = "/";
      } else {
        const error = await response.json();
        this.error = error.detail || "Registration failed";
      }
    } catch (err) {
      this.error = "Network error occurred";
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <form class="register-form" @submit=${this.handleSubmit}>
        <div class="form-group">
          <label for="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="Enter your full name"
          />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="Enter your email"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="Enter a password (min 6 characters)"
            minlength="6"
          />
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : ""}

        <button type="submit" ?disabled=${this.loading}>
          ${this.loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <style>
        .register-form {
          width: 100%;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }
        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        .error {
          color: #e74c3c;
          margin: 1rem 0;
          padding: 0.75rem;
          background: #fdf2f2;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        button {
          width: 100%;
          padding: 0.75rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        button:hover:not(:disabled) {
          background: #5a6fd8;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      </style>
    `;
  }
}

customElements.define("register-form", RegisterForm);
```

**`static/js/components/auth/google_signin_button.js`**

```javascript
import { LitElement, html } from "https://esm.run/lit";

class GoogleSigninButton extends LitElement {
  static get properties() {
    return {
      loading: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.loading = false;
  }

  // Disable Shadow DOM for global styles
  createRenderRoot() {
    return this;
  }

  async handleGoogleSignin() {
    this.loading = true;

    try {
      // Redirect to Google OAuth endpoint
      window.location.href = "/api/auth/google";
    } catch (err) {
      console.error("Google sign-in error:", err);
      this.loading = false;
    }
  }

  render() {
    return html`
      <button
        class="google-signin-btn"
        @click=${this.handleGoogleSignin}
        ?disabled=${this.loading}
      >
        <i class="fab fa-google"></i>
        ${this.loading ? "Connecting..." : "Continue with Google"}
      </button>

      <style>
        .google-signin-btn {
          width: 100%;
          padding: 0.75rem;
          background: #ffffff;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.3s;
        }

        .google-signin-btn:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #ccc;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .google-signin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .google-signin-btn i {
          color: #4285f4;
          font-size: 1.1rem;
        }
      </style>
    `;
  }
}

customElements.define("google-signin-button", GoogleSigninButton);
```

## 📄 Configuration Files

### Git Ignore

**`.gitignore`**

```gitignore
# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
pip-wheel-metadata/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Flash Feather specific
# Database files (development)
database.db
database.db-*
*.sqlite
*.sqlite3

# Upload files (development)
uploads/
*.jpg
*.jpeg
*.png
*.gif
*.pdf
*.doc
*.docx

# Production data directory (just in case)
flash-feather-data/

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
*.log
logs/

# Temporary files
*.tmp
*.temp
.tmp/

# Backup files
*.bak
*.backup

# SSL certificates (if stored locally)
*.pem
*.key
*.crt

# Deployment archives
*.tar.gz
*.zip
```

## 🔧 Google Cloud Console Setup

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Go to APIs & Services → Credentials
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"

### 2. Configure Redirect URIs

Add these authorized redirect URIs:

- **Development**: `http://localhost:8000/api/auth/google/callback`
- **Production**: `https://yourdomain.com/api/auth/google/callback`

### 3. Update Environment Variables

Copy the Client ID and Client Secret to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

## 🚀 Running the Application

### Development Mode

```bash
# Activate virtual environment
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate     # Windows

# Run the application
python -m app.main
```

Visit: `http://localhost:8000`

### Testing Token Refresh

Set short expiration times in `.env` for testing:

```env
ACCESS_TOKEN_EXPIRE_SECONDS=60     # 1 minute
REFRESH_TOKEN_EXPIRE_SECONDS=300   # 5 minutes
```

## 🔒 Security Features

### Authentication Flow

1. **Login/Register** → Server sets HTTP-only cookies
2. **Auth Middleware** → Automatically refreshes expired tokens
3. **Client Requests** → Frontend asks server for user data via `/api/auth/me`
4. **Server Redirections** → Auth pages redirect if user already logged in
5. **Google OAuth** → Complete server-side flow with automatic redirection

### Key Security Benefits

- ✅ **HTTP-only cookies** - No client-side token storage
- ✅ **Automatic token refresh** - Seamless user experience
- ✅ **Server-side redirections** - No client-side auth logic
- ✅ **Environment-aware data** - Persistent storage in production
- ✅ **Session management** - Proper OAuth state handling
- ✅ **Centralized cookie management** - Clean auth service methods

## 🎯 Flash Feather Principles

### 1. Server Controls Everything

- Authentication handled by server via cookies
- Redirections controlled by server
- Frontend only asks server for what it needs

### 2. Environment-Aware Architecture

- **Development**: Database and uploads in project root
- **Production**: Data stored outside project directory
- **Automatic**: No manual configuration needed

### 3. Minimal Frontend Logic

- Components focus on UI and user interaction
- No authentication logic in JavaScript
- Server provides data via clean API endpoints

### 4. Production-Ready Defaults

- Proper error handling and validation
- Secure cookie configuration
- Environment-based configuration
- Database persistence through deployments

### 5. Clean Code Organization

- Web routes only serve HTML and handle redirections
- API routes separated from schemas
- Business logic in service layers
- Centralized auth methods for consistency
- No unnecessary imports or dependencies

## 🎉 Summary

Flash Feather v2.4 provides a complete, modern web framework with:

- ✅ **Centralized authentication system** with clean service methods
- ✅ **Improved code organization** with consolidated auth services
- ✅ **Seamless token refresh** for uninterrupted user experience
- ✅ **Server-side control** following Flash Feather principles
- ✅ **Environment-aware architecture** for development and production
- ✅ **Clean code organization** with separated concerns
- ✅ **Modern Python practices** with updated deprecation fixes
- ✅ **Minimal, secure frontend** with Lit.js components
- ✅ **Production-ready deployment** with data persistence

**Perfect for building modern web applications with AI assistance!** 🚀
