"""Configuração do ai-service."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configurações carregadas de variáveis de ambiente."""

    database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    # Suporta AI_DATABASE_URL (docker) ou DATABASE_URL
    redis_url: str | None = None
    artifacts_path: str = "/artifacts"
    k_anonymity: int = 5
    model_version: str = "v1"
    # Se definido, /train exige header X-Train-API-Key com este valor (ou Authorization: Bearer)
    train_secret: str = ""
    # Origens CORS permitidas (ex: "https://app.example.com" ou "*" para dev)
    cors_origins: str = "*"
    # Se False, erros 500 retornam mensagem genérica (stack trace apenas no log)
    debug: bool = True

    class Config:
        env_prefix = "AI_"
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
