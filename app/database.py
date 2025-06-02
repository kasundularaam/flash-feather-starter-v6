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
