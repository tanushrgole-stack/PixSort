import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    host: str = os.getenv("AI_HOST", "0.0.0.0")
    port: int = int(os.getenv("AI_PORT", "8000"))
    model_name: str = os.getenv("AI_MODEL_NAME", "buffalo_l")
    detection_threshold: float = float(os.getenv("AI_DETECTION_THRESHOLD", "0.6"))
    similarity_threshold: float = float(os.getenv("AI_SIMILARITY_THRESHOLD", "0.45"))
    
    supabase_url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    class Config:
        env_file = "../.env"
        extra = "ignore"

settings = Settings()
