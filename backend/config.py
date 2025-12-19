import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"Loaded .env from {env_path}")
else:
    print(f"No .env file found at {env_path}")

class Settings:
    PROJECT_NAME: str = "Ready, Set, Hu!"
    API_V1_STR: str = "/api"
    # CORS origins - allow localhost for dev and Vercel domains for production
    _cors_origins = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default
    ]
    # Add Vercel preview and production domains dynamically
    _vercel_url = os.getenv("VERCEL_URL", "")
    if _vercel_url:
        _cors_origins.append(f"https://{_vercel_url}")
    BACKEND_CORS_ORIGINS: list = _cors_origins
    # Gemini API configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

settings = Settings()

# Debug: Print configuration status
if settings.GEMINI_API_KEY:
    print(f"✅ Gemini API Key configured (length: {len(settings.GEMINI_API_KEY)})")
else:
    print("⚠️  Gemini API Key NOT configured - Q&A will show setup instructions")

