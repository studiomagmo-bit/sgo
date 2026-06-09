from fastapi import APIRouter, HTTPException, Depends, status
from supabase import Client

from app.core.database import get_supabase_admin
from app.core.auth import get_current_user, CurrentUser, create_access_token
from app.core.config import settings
from app.schemas.base import LoginRequest, TokenResponse, UsuarioOut

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: Client = Depends(get_supabase_admin)):
    """Login com email e senha via Supabase Auth."""
    try:
        resp = db.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos.",
        )

    user = resp.user
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas.")

    token = create_access_token({"sub": str(user.id), "email": user.email})

    # Busca dados do perfil
    u = db.table("usuarios").select(
        "id, nome, email, construtora_id, perfil, ativo, criado_em"
    ).eq("id", str(user.id)).maybe_single().execute()

    if not u.data:
        u = db.table("usuarios_empreiteiro").select(
            "id, nome, email, construtora_id, empreiteiro_id, perfil, ativo, criado_em"
        ).eq("id", str(user.id)).maybe_single().execute()

    if not u.data or not u.data.get("ativo"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo.")

    return TokenResponse(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UsuarioOut(**u.data),
    )


@router.post("/logout")
async def logout(current_user: CurrentUser = Depends(get_current_user)):
    """Encerra sessão (client-side: descartar token)."""
    return {"detail": "Logout realizado com sucesso."}


@router.get("/me", response_model=UsuarioOut)
async def me(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    """Retorna dados do usuário logado."""
    resp = db.table("usuarios").select("*").eq("id", current_user.user_id).maybe_single().execute()
    if not resp.data:
        resp = db.table("usuarios_empreiteiro").select("*").eq("id", current_user.user_id).maybe_single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return UsuarioOut(**resp.data)
