"""Configuração do ai-service."""
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Configurações carregadas de variáveis de ambiente."""

    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/postgres",
        validation_alias=AliasChoices("AI_DATABASE_URL", "DATABASE_URL"),
    )
    # Suporta AI_DATABASE_URL (preferencial) ou DATABASE_URL.
    redis_url: str | None = None
    artifacts_path: str = "artifacts"
    k_anonymity: int = 5
    model_version: str = "v1"
    # Se definido, /train exige header X-Train-API-Key com este valor (ou Authorization: Bearer)
    train_secret: str = ""
    # Origens CORS permitidas (ex: "https://app.example.com" ou "*" para dev)
    cors_origins: str = "*"
    # Se False, erros 500 retornam mensagem genérica (stack trace apenas no log)
    debug: bool = True

    model_config = SettingsConfigDict(
        env_prefix="AI_",
        env_file=(".env.local", ".env", "../.env.local", "../.env"),
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
