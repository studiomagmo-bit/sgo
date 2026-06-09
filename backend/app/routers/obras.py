from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.core.auth import get_current_user, CurrentUser
from app.core.database import get_supabase_admin
from app.core.exceptions import NotFoundError, ForbiddenError
from app.schemas.obras import (
    ObraCreate, ObraUpdate, ObraOut, ObraDetalhada,
    EstruturaCreate, EstruturaUpdate, EstruturaOut,
    ServicoCreate, ServicoUpdate, ServicoOut,
)

router = APIRouter(prefix="/obras", tags=["Obras"])
router_servicos = APIRouter(prefix="/servicos", tags=["Serviços"])


# ─── OBRAS ───────────────────────────────────────────────────

@router.get("", response_model=List[ObraOut])
async def listar_obras(
    status: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("obras").select("*").eq("construtora_id", current_user.construtora_id).eq("ativa", True)
    if status:
        q = q.eq("status", status)
    if tipo:
        q = q.eq("tipo", tipo)
    resp = q.order("criado_em", desc=True).execute()
    return resp.data or []


@router.post("", response_model=ObraOut, status_code=201)
async def criar_obra(
    payload: ObraCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    data = payload.model_dump(exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("obras").insert(data).execute()
    return resp.data[0]


@router.get("/{obra_id}", response_model=ObraDetalhada)
async def detalhar_obra(
    obra_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    resp = db.table("obras").select("*").eq("id", str(obra_id)).eq("construtora_id", current_user.construtora_id).maybe_single().execute()
    if not resp.data:
        raise NotFoundError("Obra")
    obra = resp.data

    # Estruturas de primeiro nível
    est = db.table("estrutura_obra").select("*").eq("obra_id", str(obra_id)).is_("parent_id", "null").order("ordem").execute()
    obra["estruturas"] = est.data or []

    # Totais
    atv = db.table("atividades").select("id, percentual_exec", count="exact").eq("obra_id", str(obra_id)).execute()
    obra["total_atividades"] = atv.count or 0
    if atv.data:
        obra["percentual_geral"] = round(sum(a["percentual_exec"] for a in atv.data) / len(atv.data), 2)
    return obra


@router.put("/{obra_id}", response_model=ObraOut)
async def atualizar_obra(
    obra_id: UUID,
    payload: ObraUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    data = payload.model_dump(exclude_none=True)
    resp = db.table("obras").update(data).eq("id", str(obra_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Obra")
    return resp.data[0]


@router.delete("/{obra_id}", status_code=204)
async def desativar_obra(
    obra_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador")
    db.table("obras").update({"ativa": False}).eq("id", str(obra_id)).eq("construtora_id", current_user.construtora_id).execute()


# ─── ESTRUTURA DA OBRA ───────────────────────────────────────

@router.get("/{obra_id}/estrutura", response_model=List[EstruturaOut])
async def listar_estrutura(
    obra_id: UUID,
    parent_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("estrutura_obra").select("*").eq("obra_id", str(obra_id)).eq("ativo", True)
    if parent_id:
        q = q.eq("parent_id", str(parent_id))
    else:
        q = q.is_("parent_id", "null")
    resp = q.order("ordem").execute()
    return resp.data or []


@router.post("/{obra_id}/estrutura", response_model=EstruturaOut, status_code=201)
async def criar_estrutura(
    obra_id: UUID,
    payload: EstruturaCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro", "pcp")
    data = payload.model_dump(exclude_none=True)
    data["obra_id"] = str(obra_id)
    resp = db.table("estrutura_obra").insert(data).execute()
    return resp.data[0]


@router.put("/{obra_id}/estrutura/{estrutura_id}", response_model=EstruturaOut)
async def atualizar_estrutura(
    obra_id: UUID,
    estrutura_id: UUID,
    payload: EstruturaUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro", "pcp")
    data = payload.model_dump(exclude_none=True)
    resp = db.table("estrutura_obra").update(data).eq("id", str(estrutura_id)).eq("obra_id", str(obra_id)).execute()
    if not resp.data:
        raise NotFoundError("Estrutura")
    return resp.data[0]


# ─── USUÁRIOS DA OBRA ────────────────────────────────────────

@router.post("/{obra_id}/usuarios/{usuario_id}", status_code=201)
async def vincular_usuario_obra(
    obra_id: UUID,
    usuario_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    db.table("obra_usuarios").insert({"obra_id": str(obra_id), "usuario_id": str(usuario_id)}).execute()
    return {"detail": "Usuário vinculado à obra."}


@router.delete("/{obra_id}/usuarios/{usuario_id}", status_code=204)
async def desvincular_usuario_obra(
    obra_id: UUID,
    usuario_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    db.table("obra_usuarios").delete().eq("obra_id", str(obra_id)).eq("usuario_id", str(usuario_id)).execute()


# ─── SERVIÇOS ────────────────────────────────────────────────

@router_servicos.get("", response_model=List[ServicoOut])
async def listar_servicos(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    resp = db.table("servicos").select("*, servico_materiais(*)").eq("construtora_id", current_user.construtora_id).eq("ativo", True).order("nome").execute()
    result = []
    for s in (resp.data or []):
        s["materiais"] = s.pop("servico_materiais", [])
        result.append(s)
    return result


@router_servicos.post("", response_model=ServicoOut, status_code=201)
async def criar_servico(
    payload: ServicoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "pcp")
    materiais = payload.materiais or []
    data = payload.model_dump(exclude={"materiais"}, exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("servicos").insert(data).execute()
    servico = resp.data[0]
    if materiais:
        mats = [{"servico_id": servico["id"], **m.model_dump()} for m in materiais]
        db.table("servico_materiais").insert(mats).execute()
    return {**servico, "materiais": materiais}


@router_servicos.put("/{servico_id}", response_model=ServicoOut)
async def atualizar_servico(
    servico_id: UUID,
    payload: ServicoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "pcp")
    data = payload.model_dump(exclude_none=True)
    resp = db.table("servicos").update(data).eq("id", str(servico_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Serviço")
    return resp.data[0]
