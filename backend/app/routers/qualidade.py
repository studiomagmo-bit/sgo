from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.core.auth import get_current_user, CurrentUser
from app.core.database import get_supabase_admin
from app.core.exceptions import NotFoundError
from app.schemas.qualidade import (
    InspecaoCreate, InspecaoUpdate, InspecaoOut,
    PendenciaCreate, PendenciaUpdate, PendenciaOut,
    ContratoCreate, ContratoUpdate, ContratoOut,
    MedicaoCreate, MedicaoUpdate, MedicaoOut,
    EquipamentoCreate, EquipamentoUpdate, EquipamentoOut,
    AlocacaoCreate, AlocacaoOut,
)

router = APIRouter(tags=["Qualidade e Contratos"])


# ─── INSPEÇÕES ───────────────────────────────────────────────

@router.get("/inspecoes", response_model=List[InspecaoOut])
async def listar_inspecoes(
    obra_id: UUID = Query(...),
    status: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("inspecoes").select("*").eq("obra_id", str(obra_id)).eq("construtora_id", current_user.construtora_id)
    if status:
        q = q.eq("status", status)
    resp = q.order("data_solicitacao", desc=True).execute()
    return resp.data or []


@router.post("/inspecoes", response_model=InspecaoOut, status_code=201)
async def criar_inspecao(
    payload: InspecaoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    data = payload.model_dump(exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    data["criado_por"] = current_user.user_id
    resp = db.table("inspecoes").insert(data).execute()
    return resp.data[0]


@router.put("/inspecoes/{inspecao_id}", response_model=InspecaoOut)
async def atualizar_inspecao(
    inspecao_id: UUID,
    payload: InspecaoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro")
    data = payload.model_dump(exclude_none=True)
    resp = db.table("inspecoes").update(data).eq("id", str(inspecao_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Inspeção")
    return resp.data[0]


# ─── PENDÊNCIAS ──────────────────────────────────────────────

@router.get("/pendencias", response_model=List[PendenciaOut])
async def listar_pendencias(
    obra_id: UUID = Query(...),
    status: Optional[str] = Query(None),
    responsavel_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("pendencias").select("*").eq("obra_id", str(obra_id)).eq("construtora_id", current_user.construtora_id)
    if status:
        q = q.eq("status", status)
    if responsavel_id:
        q = q.eq("responsavel_id", str(responsavel_id))
    resp = q.order("criado_em", desc=True).execute()
    return resp.data or []


@router.post("/pendencias", response_model=PendenciaOut, status_code=201)
async def criar_pendencia(
    payload: PendenciaCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    data = payload.model_dump(exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    data["criado_por"] = current_user.user_id
    resp = db.table("pendencias").insert(data).execute()
    return resp.data[0]


@router.put("/pendencias/{pendencia_id}", response_model=PendenciaOut)
async def atualizar_pendencia(
    pendencia_id: UUID,
    payload: PendenciaUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    data = payload.model_dump(exclude_none=True)
    if payload.status == "corrigida":
        data["corrigida_por"] = current_user.user_id
        from datetime import datetime
        data["corrigida_em"] = datetime.utcnow().isoformat()
    if payload.status == "validada":
        data["validada_por"] = current_user.user_id
        from datetime import datetime
        data["validada_em"] = datetime.utcnow().isoformat()
    resp = db.table("pendencias").update(data).eq("id", str(pendencia_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Pendência")
    return resp.data[0]


# ─── CONTRATOS ───────────────────────────────────────────────

@router.get("/contratos", response_model=List[ContratoOut])
async def listar_contratos(
    obra_id: Optional[UUID] = Query(None),
    empreiteiro_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("contratos").select("*, contrato_itens(*)")
    if current_user.is_empreiteiro:
        q = q.eq("empreiteiro_id", current_user.empreiteiro_id)
    else:
        q = q.eq("construtora_id", current_user.construtora_id)
    if obra_id:
        q = q.eq("obra_id", str(obra_id))
    if empreiteiro_id and not current_user.is_empreiteiro:
        q = q.eq("empreiteiro_id", str(empreiteiro_id))
    resp = q.order("criado_em", desc=True).execute()
    result = []
    for c in (resp.data or []):
        c["itens"] = c.pop("contrato_itens", [])
        result.append(c)
    return result


@router.post("/contratos", response_model=ContratoOut, status_code=201)
async def criar_contrato(
    payload: ContratoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    itens = payload.itens or []
    data = payload.model_dump(exclude={"itens"}, exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("contratos").insert(data).execute()
    contrato = resp.data[0]
    if itens:
        rows = [{"contrato_id": contrato["id"], **i.model_dump()} for i in itens]
        db.table("contrato_itens").insert(rows).execute()
    contrato["itens"] = itens
    return contrato


@router.put("/contratos/{contrato_id}", response_model=ContratoOut)
async def atualizar_contrato(
    contrato_id: UUID,
    payload: ContratoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    data = payload.model_dump(exclude_none=True)
    resp = db.table("contratos").update(data).eq("id", str(contrato_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Contrato")
    return resp.data[0]


# ─── MEDIÇÕES ────────────────────────────────────────────────

@router.get("/medicoes", response_model=List[MedicaoOut])
async def listar_medicoes(
    obra_id: Optional[UUID] = Query(None),
    contrato_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("medicoes").select("*, banco_medicao(*)")
    if current_user.is_empreiteiro:
        q = q.eq("empreiteiro_id", current_user.empreiteiro_id)
    else:
        q = q.eq("construtora_id", current_user.construtora_id)
    if obra_id:
        q = q.eq("obra_id", str(obra_id))
    if contrato_id:
        q = q.eq("contrato_id", str(contrato_id))
    if status:
        q = q.eq("status", status)
    resp = q.order("numero").execute()
    result = []
    for m in (resp.data or []):
        m["itens"] = m.pop("banco_medicao", [])
        result.append(m)
    return result


@router.post("/medicoes", response_model=MedicaoOut, status_code=201)
async def criar_medicao(
    payload: MedicaoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro")
    itens = payload.itens or []
    data = payload.model_dump(exclude={"itens"}, exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("medicoes").insert(data).execute()
    medicao = resp.data[0]
    if itens:
        rows = [{"medicao_id": medicao["id"], "construtora_id": str(current_user.construtora_id), **i.model_dump()} for i in itens]
        db.table("banco_medicao").insert(rows).execute()
    medicao["itens"] = itens
    return medicao


@router.put("/medicoes/{medicao_id}", response_model=MedicaoOut)
async def atualizar_medicao(
    medicao_id: UUID,
    payload: MedicaoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro")
    data = payload.model_dump(exclude_none=True)
    if payload.status == "aprovada":
        data["aprovada_por"] = current_user.user_id
        from datetime import datetime
        data["aprovada_em"] = datetime.utcnow().isoformat()
    if payload.status == "fechada":
        data["fechada_por"] = current_user.user_id
        from datetime import datetime
        data["fechada_em"] = datetime.utcnow().isoformat()
    resp = db.table("medicoes").update(data).eq("id", str(medicao_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Medição")
    return resp.data[0]


# ─── EQUIPAMENTOS ────────────────────────────────────────────

@router.get("/equipamentos", response_model=List[EquipamentoOut])
async def listar_equipamentos(
    status: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("equipamentos").select("*").eq("construtora_id", current_user.construtora_id).eq("ativo", True)
    if status:
        q = q.eq("status", status)
    resp = q.order("nome").execute()
    return resp.data or []


@router.post("/equipamentos", response_model=EquipamentoOut, status_code=201)
async def criar_equipamento(
    payload: EquipamentoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    data = payload.model_dump(exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("equipamentos").insert(data).execute()
    return resp.data[0]


@router.put("/equipamentos/{equip_id}", response_model=EquipamentoOut)
async def atualizar_equipamento(
    equip_id: UUID,
    payload: EquipamentoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    data = payload.model_dump(exclude_none=True)
    resp = db.table("equipamentos").update(data).eq("id", str(equip_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Equipamento")
    return resp.data[0]


@router.post("/equipamentos/alocacoes", response_model=AlocacaoOut, status_code=201)
async def alocar_equipamento(
    payload: AlocacaoCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "mestre")
    data = payload.model_dump(exclude_none=True)
    data["solicitado_por"] = current_user.user_id
    resp = db.table("equipamento_alocacoes").insert(data).execute()
    # Atualiza status do equipamento
    db.table("equipamentos").update({"status": "reservado"}).eq("id", str(payload.equipamento_id)).execute()
    return resp.data[0]
