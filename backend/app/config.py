import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import json

# Determine the environment and set the appropriate .env file path
app_env = os.getenv('APP_ENV', 'development')
env_file_path = Path(__file__).parent.parent

if app_env == 'production':
    env_file = env_file_path / ".env.production"
elif app_env == 'staging':
    env_file = env_file_path / ".env.staging"
else:
    # Default to .env.development if not in production or staging
    env_file = env_file_path / ".env.development"

class Settings(BaseSettings):
    ENV: str = "dev"
    PROJECT_NAME: str = "Loom"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "your-super-secure-secret-key-change-this-in-production-12345678901234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours for development/testing
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Security Settings
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = False  # Temporarily disabled for development
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGITS: bool = True
    PASSWORD_REQUIRE_SPECIAL_CHARS: bool = False  # Temporarily disabled for development

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100  # requests per window
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # Caching
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 300  # 5 minutes default TTL
    CACHE_REDIS_URL: str = "redis://localhost:6379"
    CACHE_MAX_MEMORY: str = "100mb"

    # MongoDB
    MONGO_URI: str = "mongodb://127.0.0.1:27017"
    MONGO_DB: str = "loom"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:7100", "http://localhost:7500"]

    # Frontend base URL (used to generate absolute links like partner invites)
    FRONTEND_BASE_URL: str = "http://localhost:7100"

    # Feature Flags
    FEATURE_PUSH_NOTIFICATIONS: bool = False

    # Email/SMTP Settings (optional)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    EMAIL_FROM: str = ""

    # WebSocket Settings
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    WS_CONNECTION_TIMEOUT: int = 10  # seconds
    WS_MAX_CONNECTIONS_PER_USER: int = 50  # Increased from 10 to prevent connection limit issues
    WS_MAX_CONNECTIONS_PER_ROOM: int = 100
    WS_MESSAGE_QUEUE_SIZE: int = 50
    WS_RECONNECT_MAX_ATTEMPTS: int = 5
    WS_RECONNECT_BASE_DELAY: float = 1.0  # seconds
    WS_RECONNECT_MAX_DELAY: float = 30.0  # seconds
    WS_PING_TIMEOUT: int = 5  # seconds
    WS_CLOSE_TIMEOUT: int = 5  # seconds

    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse CORS_ORIGINS from environment if it's a string
        cors_env = os.getenv("CORS_ORIGINS")
        if cors_env and isinstance(cors_env, str):
            try:
                # Try to parse as JSON first
                self.CORS_ORIGINS = json.loads(cors_env)
            except json.JSONDecodeError:
                # If that fails, split by comma and strip whitespace
                self.CORS_ORIGINS = [origin.strip() for origin in cors_env.split(",")]

    # VAPID settings for push notifications
    VAPID_SUBJECT: str = "mailto:admin@loom.com"
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""


settings = Settings()