import os
from app.middlewares.auth_middleware import AuthMiddleware
from app.storage import init_storage, get_uploads_path
from app.database import init_db
from app.routes.api.auth.auth_api import router as auth_api_router
from app.routes.web.main_web import router as web_router
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from dotenv import load_dotenv
from starlette.middleware.sessions import SessionMiddleware

# Load environment variables from .env file
load_dotenv()

# Import routers

# Import database and storage functions

# Import middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown (if needed)

# Create FastAPI app with lifespan
app = FastAPI(title="Flash Feather App", version="2.1.0", lifespan=lifespan)

# Add SessionMiddleware FIRST (required for Google OAuth)
SECRET_KEY = os.getenv(
    "JWT_SECRET", "your_super_secret_jwt_key_change_in_production")
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Initialize directories first (before mounting)
init_storage()

# Add authentication middleware
app.add_middleware(AuthMiddleware)

# Configure static files (after directories are created)
app.mount("/static", StaticFiles(directory=Path(__file__).parent.parent /
          "static"), name="static")
app.mount("/uploads", StaticFiles(directory=get_uploads_path()), name="uploads")

# Include routers
app.include_router(web_router)
app.include_router(auth_api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
