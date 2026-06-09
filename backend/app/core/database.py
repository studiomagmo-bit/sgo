from supabase import create_client, Client
from app.core.config import settings

# Cliente público (usa anon key — respeita RLS)
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_ANON_KEY,
)

# Cliente service role (ignora RLS — usar só internamente)
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY,
)


def get_supabase() -> Client:
    """Dependency: retorna cliente público."""
    return supabase


def get_supabase_admin() -> Client:
    """Dependency: retorna cliente admin (service role)."""
    return supabase_admin
