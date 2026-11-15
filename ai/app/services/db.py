"""
Supabase client singleton for the AI service.
Uses the service-role key for unrestricted read/write (server-side only).
"""
import logging
from supabase import create_client, Client

logger = logging.getLogger("pixsort.ai.db")
_client: Client | None = None


def get_db() -> Client:
    global _client
    if _client is None:
        from app.config import settings
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError(
                "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
            )
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        logger.info("Supabase client initialised.")
    return _client
