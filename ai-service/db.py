"""Conexão com Postgres e modelos SQLAlchemy."""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from config import get_settings

_settings = get_settings()
_engine = create_engine(
    _settings.database_url,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def get_db():
    """Dependency para FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def raw_connection():
    """Retorna connection raw para queries complexas com pandas."""
    return _engine.connect()


def table_exists(db, table_name: str) -> bool:
    """Verifica se tabela existe."""
    r = db.execute(
        text(
            """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = :name
        )
        """
        ),
        {"name": table_name},
    )
    return r.scalar() is True
