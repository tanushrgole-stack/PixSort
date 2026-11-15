import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    model_name: str = "buffalo_l"
    detection_threshold: float = 0.6
    similarity_threshold: float = 0.45
    clustering_threshold: float = 0.50   # cosine distance for face clustering into people
    phash_dup_threshold: int = 8          # hamming distance for duplicate detection

    # Worker tuning
    worker_poll_interval: float = 3.0    # seconds between polls
    worker_batch_size: int = 10          # photos pulled per poll
    worker_max_retries: int = 3

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    class Config:
        env_file = "../.env"
        env_prefix = ""
        extra = "ignore"

    # Map env names explicitly
    model_config = {
        "env_file": "../.env",
        "extra": "ignore",
    }

    def __init__(self, **data):
        super().__init__(
            host=os.getenv("AI_HOST", "0.0.0.0"),
            port=int(os.getenv("AI_PORT", "8000")),
            model_name=os.getenv("AI_MODEL_NAME", "buffalo_l"),
            detection_threshold=float(os.getenv("AI_DETECTION_THRESHOLD", "0.6")),
            similarity_threshold=float(os.getenv("AI_SIMILARITY_THRESHOLD", "0.45")),
            clustering_threshold=float(os.getenv("AI_CLUSTERING_THRESHOLD", "0.50")),
            phash_dup_threshold=int(os.getenv("AI_PHASH_DUP_THRESHOLD", "8")),
            worker_poll_interval=float(os.getenv("AI_WORKER_POLL_INTERVAL", "3.0")),
            worker_batch_size=int(os.getenv("AI_WORKER_BATCH_SIZE", "10")),
            worker_max_retries=int(os.getenv("AI_WORKER_MAX_RETRIES", "3")),
            supabase_url=os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""),
            supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            **data,
        )

settings = Settings()
