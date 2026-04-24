from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import get_settings

settings = get_settings()
url = settings.DATABASE_URL
if url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+pg8000://", 1)
# Remove ?schema=public from URL (pg8000 doesn't support it)
url = url.split("?")[0]
engine = create_engine(
    url,
    pool_pre_ping=True,
    connect_args={"database": "nestor"},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()