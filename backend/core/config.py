"""
VentureNode — Environment & Configuration Management.

Loads, validates, and exposes all environment variables using
Pydantic BaseSettings. This is the single source of truth for
application configuration. No other module reads os.environ directly.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from dotenv import find_dotenv
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings loaded from environment variables.

    All values are validated at application startup. The process will
    fail fast with a descriptive error if any required variable is
    missing or malformed — preventing silent runtime failures.
    """

    model_config = SettingsConfigDict(
        env_file=find_dotenv(usecwd=True) or ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------ #
    # Application Meta                                                     #
    # ------------------------------------------------------------------ #
    app_name: str = Field(default="VentureNode", description="Application display name.")
    app_version: str = Field(default="0.1.0", description="Semantic version string.")
    environment: str = Field(
        default="development",
        description="Deployment environment: development | staging | production.",
    )
    debug: bool = Field(default=False, description="Enable verbose debug logging.")

    # ------------------------------------------------------------------ #
    # CORS                                                                 #
    # ------------------------------------------------------------------ #
    cors_origins: list[str] = Field(
        default=["http://localhost:3000"],
        description="List of allowed CORS origins.",
    )

    # ------------------------------------------------------------------ #
    # Notion Integration                                                   #
    # ------------------------------------------------------------------ #
    notion_token: SecretStr = Field(
        ...,
        description="Notion Internal Integration Token (secret_xxx).",
    )

    # Database IDs — optional at Phase 1, required before agent execution.
    notion_ideas_db_id: Optional[str] = Field(
        default=None, description="Notion 'Ideas' database page ID."
    )
    notion_research_db_id: Optional[str] = Field(
        default=None, description="Notion 'Research' database page ID."
    )
    notion_roadmap_db_id: Optional[str] = Field(
        default=None, description="Notion 'Roadmap' database page ID."
    )
    notion_tasks_db_id: Optional[str] = Field(
        default=None, description="Notion 'Tasks' database page ID."
    )
    notion_reports_db_id: Optional[str] = Field(
        default=None, description="Notion 'Reports' database page ID."
    )

    # ------------------------------------------------------------------ #
    # LLM Inference                                                        #
    # ------------------------------------------------------------------ #
    groq_api_key: SecretStr = Field(
        ...,
        description="Groq API key for LLM inference (gsk_xxx).",
    )
    groq_model: str = Field(
        default="llama-3.3-70b-versatile",
        description="Groq model identifier to use for all agent inference.",
    )
    groq_temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=2.0,
        description="Sampling temperature. Lower = more deterministic.",
    )

    # ------------------------------------------------------------------ #
    # Clerk Authentication                                                 #
    # ------------------------------------------------------------------ #
    clerk_secret_key: SecretStr = Field(
        ...,
        description="Clerk Secret Key (sk_test_xxx or sk_live_xxx).",
    )
    clerk_frontend_api: str = Field(
        ...,
        description=(
            "Clerk Frontend API hostname — used as the JWKS URL root and "
            "the expected 'iss' claim.  Example: unbiased-starfish-85.clerk.accounts.dev"
        ),
    )

    # ------------------------------------------------------------------ #
    # Rate Limiting                                                        #
    # ------------------------------------------------------------------ #
    rate_limit_per_minute: int = Field(
        default=60,
        description="Maximum API requests per IP per minute.",
    )

    # ------------------------------------------------------------------ #
    # Validators                                                           #
    # ------------------------------------------------------------------ #
    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Ensure environment is one of the accepted deployment tiers."""
        allowed = {"development", "staging", "production"}
        if v.lower() not in allowed:
            raise ValueError(f"'environment' must be one of {allowed}, got '{v}'.")
        return v.lower()

    # ------------------------------------------------------------------ #
    # Convenience Properties                                               #
    # ------------------------------------------------------------------ #
    @property
    def is_production(self) -> bool:
        """Returns True if the application is running in production mode."""
        return self.environment == "production"

    @property
    def notion_token_value(self) -> str:
        """Returns the raw Notion token string for SDK instantiation."""
        return self.notion_token.get_secret_value()

    @property
    def groq_api_key_value(self) -> str:
        """Returns the raw Groq API key string for SDK instantiation."""
        return self.groq_api_key.get_secret_value()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached application settings singleton.

    Uses lru_cache to ensure the .env file is parsed exactly once
    per process lifetime, eliminating repeated disk I/O.

    Returns:
        Settings: The validated application configuration object.
    """
    return Settings()
