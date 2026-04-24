from pydantic_settings import BaseSettings
from functools import lru_cache
import os


def _env_file_path() -> str:
    return "/Users/vish/Code/recallhero/.env"


class Settings(BaseSettings):
    DATABASE_URL: str
    GEMINI_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEB_HOOK_SECRET: str = ""
    JWT_SECRET: str = ""
    APP_SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Amazon SP-API
    AMAZON_CLIENT_ID: str = ""
    AMAZON_CLIENT_SECRET: str = ""
    AMAZON_REFRESH_TOKEN: str = ""
    AMAZON_SELLER_ID: str = ""
    
    # Shopify
    SHOPIFY_API_KEY: str = ""
    SHOPIFY_API_SECRET: str = ""
    SHOPIFY_ACCESS_TOKEN: str = ""
    SHOPIFY_REDIRECT_URI: str = "https://recallhero.com/api/integrations/shopify/callback"

    class Config:
        env_file = "/Users/vish/Code/recallhero/.env"
        case_sensitive = True
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()