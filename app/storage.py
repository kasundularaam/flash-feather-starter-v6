import os
from pathlib import Path
from fastapi import UploadFile
import shutil
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
