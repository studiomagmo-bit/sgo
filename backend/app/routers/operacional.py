from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.core.auth import get_current_user, CurrentUser
from app.core.database import get_supabase_admin
from app.core.exceptions import NotFoundError
from app.schemas.operacional import (
    EfetivoCreate, EfetivoUpdate, EfetivoOut,
    ProducaoCreate, ProducaoUpdate, ProducaoOut,
    ImpedimentoCreate, ImpedimentoUpdate, ImpedimentoOut,
)

router = APIRouter(tags=["Operacional"])


# ─── EFETIVO DIÁRIO ──────────────────────────────────────────

@router.get("/efetivo", response_model=List[EfetivoOut])
async def listar_efetivo(
    obra_id: UUID = Query(...),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    empreiteiro_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("efetivo_diario").select("*, efetivo_colaboradores(*)").eq("obra_id", str(obra_id)).eq("construtora_id", current_user.construtora_id)
    if empreiteiro_id:
        q = q.eq("empreiteiro_id", str(empreiteiro_id))
    if data_inicio:
        q = q.gte("data", str(data_inicio))
    if data_fim:
        q = q.lte("data", str(data_fim))
    resp = q.order("data", desc=True).execute()
    result = []
    for e in (resp.data or []):
        e["colaboradores"] = e.pop("efetivo_colaboradores", [])
        result.append(e)
    return result


@router.post("/efetivo", response_model=EfetivoOut, status_code=201)
async def registrar_efetivo(
    payload: EfetivoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    colaboradores = payload.colaboradores or []
    data = payload.model_dump(exclude={"colaboradores"}, exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("efetivo_diario").insert(data).execute()
    efetivo = resp.data[0]

    if colaboradores:
        rows = [{"efetivo_id": efetivo["id"], **c.model_dump(exclude_none=True)} for c in colaboradores]
        colab_resp = db.table("efetivo_colaboradores").insert(rows).execute()
        efetivo["colaboradores"] = colab_resp.data or []
    else:
        efetivo["colaboradores"] = []
    return efetivo


@router.put("/efetivo/{efetivo_id}", response_model=EfetivoOut)
async def atualizar_efetivo(
    efetivo_id: UUID,
    payload: EfetivoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    data = payload.model_dump(exclude_none=True)
    resp = db.table("efetivo_diario").update(data).eq("id", str(efetivo_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Efetivo")
    return resp.data[0]


# ─── PRODUÇÕES ───────────────────────────────────────────────

@router.get("/producoes", response_model=List[ProducaoOut])
async def listar_producoes(
    obra_id: UUID = Query(...),
    atividade_id: Optional[UUID] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    empreiteiro_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("producoes").select("*, producao_individual(*)").eq("obra_id", str(obra_id))

    # Empreiteiro só vê as próprias
    if current_user.is_empreiteiro:
        q = q.eq("empreiteiro_id", current_user.empreiteiro_id)
    else:
        q = q.eq("construtora_id", current_user.construtora_id)
        if empreiteiro_id:
            q = q.eq("empreiteiro_id", str(empreiteiro_id))

    if atividade_id:
        q = q.eq("atividade_id", str(atividade_id))
    if data_inicio:
        q = q.gte("data", str(data_inicio))
    if data_fim:
        q = q.lte("data", str(data_fim))

    resp = q.order("data", desc=True).execute()
    result = []
    for p in (resp.data or []):
        p["individual"] = p.pop("producao_individual", [])
        result.append(p)
    return result


@router.post("/producoes", response_model=ProducaoOut, status_code=201)
async def registrar_producao(
    payload: ProducaoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    individual = payload.individual or []
    data = payload.model_dump(exclude={"individual"}, exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("producoes").insert(data).execute()
    producao = resp.data[0]

    if individual:
        rows = [{"producao_id": producao["id"], **i.model_dump()} for i in individual]
        db.table("producao_individual").insert(rows).execute()

    producao["individual"] = individual
    return producao


@router.put("/producoes/{producao_id}", response_model=ProducaoOut)
async def atualizar_producao(
    producao_id: UUID,
    payload: ProducaoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    data = payload.model_dump(exclude_none=True)
    resp = db.table("producoes").update(data).eq("id", str(producao_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Produção")
    return resp.data[0]


@router.delete("/producoes/{producao_id}", status_code=204)
async def deletar_producao(
    producao_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro", "mestre")
    db.table("producoes").delete().eq("id", str(producao_id)).eq("construtora_id", current_user.construtora_id).execute()


# ─── IMPEDIMENTOS ────────────────────────────────────────────

@router.get("/impedimentos", response_model=List[ImpedimentoOut])
async def listar_impedimentos(
    obra_id: UUID = Query(...),
    status: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("impedimentos").select("*").eq("obra_id", str(obra_id)).eq("construtora_id", current_user.construtora_id)
    if status:
        q = q.eq("status", status)
    if categoria:
        q = q.eq("categoria", categoria)
    resp = q.order("criado_em", desc=True).execute()
    return resp.data or []


@router.post("/impedimentos", response_model=ImpedimentoOut, status_code=201)
async def criar_impedimento(
    payload: ImpedimentoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    data = payload.model_dump(exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    data["criado_por"] = current_user.user_id
    resp = db.table("impedimentos").insert(data).execute()
    return resp.data[0]


@router.put("/impedimentos/{impedimento_id}", response_model=ImpedimentoOut)
async def atualizar_impedimento(
    impedimento_id: UUID,
    payload: ImpedimentoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    data = payload.model_dump(exclude_none=True)
    if payload.status == "resolvido":
        data["resolvido_por"] = current_user.user_id
    resp = db.table("impedimentos").update(data).eq("id", str(impedimento_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Impedimento")
    return resp.data[0]
