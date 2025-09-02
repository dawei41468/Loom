import os
from typing import List
from pydantic_settings import BaseSettings
import json


class Settings(BaseSettings):
    ENV: str = "dev"
    PROJECT_NAME: str = "Loom"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "CHANGE_ME_LONG_RANDOM"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # MongoDB
    MONGO_URI: str = "mongodb://127.0.0.1:27017"
    MONGO_DB: str = "loom"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:7100", "http://localhost:7500"]
    
    model_config = {
        "env_file": ".env"
    }
    
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


settings = Settings()