from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from supabase import Client

from app.core.config import settings
from app.core.database import get_supabase_admin

security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )


class CurrentUser:
    def __init__(self, user_id: str, email: str, construtora_id: Optional[str],
                 perfil: Optional[str], empreiteiro_id: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.construtora_id = construtora_id
        self.perfil = perfil
        self.empreiteiro_id = empreiteiro_id

    @property
    def is_admin(self) -> bool:
        return self.perfil == "administrador"

    @property
    def is_construtora(self) -> bool:
        return self.construtora_id is not None and self.empreiteiro_id is None

    @property
    def is_empreiteiro(self) -> bool:
        return self.empreiteiro_id is not None

    def require_perfis(self, *perfis: str):
        if self.perfil not in perfis:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Perfil '{self.perfil}' não tem permissão para esta ação.",
            )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_supabase_admin),
) -> CurrentUser:
    token = credentials.credentials
    payload = decode_token(token)
    user_id: str = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

    # Busca usuário da construtora
    resp = db.table("usuarios").select(
        "id, email, construtora_id, perfil"
    ).eq("id", user_id).eq("ativo", True).maybe_single().execute()

    if resp.data:
        u = resp.data
        return CurrentUser(
            user_id=u["id"],
            email=u["email"],
            construtora_id=u["construtora_id"],
            perfil=u["perfil"],
        )

    # Busca usuário empreiteiro
    resp_emp = db.table("usuarios_empreiteiro").select(
        "id, email, construtora_id, empreiteiro_id, perfil"
    ).eq("id", user_id).eq("ativo", True).maybe_single().execute()

    if resp_emp.data:
        u = resp_emp.data
        return CurrentUser(
            user_id=u["id"],
            email=u["email"],
            construtora_id=u["construtora_id"],
            perfil=u["perfil"],
            empreiteiro_id=u["empreiteiro_id"],
        )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado.")
