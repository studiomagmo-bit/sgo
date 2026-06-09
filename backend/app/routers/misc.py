from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, Query, UploadFile, File
from supabase import Client

from app.core.auth import get_current_user, CurrentUser
from app.core.database import get_supabase_admin
from app.core.exceptions import NotFoundError
from app.schemas.base import UsuarioCreate, UsuarioUpdate, UsuarioOut, EmpreiteiroCreate, EmpreiteiroUpdate, EmpreiteiroOut, ColaboradorCreate, ColaboradorUpdate, ColaboradorOut

router_usuarios   = APIRouter(prefix="/usuarios",    tags=["Usuários"])
router_almox      = APIRouter(prefix="/almoxarifado", tags=["Almoxarifado"])
router_diario     = APIRouter(prefix="/diario",       tags=["Diário de Obra"])
router_dashboard  = APIRouter(prefix="/dashboard",    tags=["Dashboard"])


# ─── USUÁRIOS ────────────────────────────────────────────────

@router_usuarios.get("", response_model=List[UsuarioOut])
async def listar_usuarios(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    resp = db.table("usuarios").select("*").eq("construtora_id", current_user.construtora_id).eq("ativo", True).order("nome").execute()
    return resp.data or []


@router_usuarios.post("", response_model=UsuarioOut, status_code=201)
async def criar_usuario(
    payload: UsuarioCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador")
    # Cria no Supabase Auth
    auth_resp = db.auth.admin.create_user({
        "email": payload.email,
        "password": payload.password,
        "email_confirm": True,
    })
    user_id = auth_resp.user.id
    # Cria na tabela usuarios
    data = payload.model_dump(exclude={"password"}, exclude_none=True)
    data["id"] = str(user_id)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("usuarios").upsert(data).execute()
    return resp.data[0]


@router_usuarios.put("/{usuario_id}", response_model=UsuarioOut)
async def atualizar_usuario(
    usuario_id: UUID,
    payload: UsuarioUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador")
    data = payload.model_dump(exclude_none=True)
    resp = db.table("usuarios").update(data).eq("id", str(usuario_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Usuário")
    return resp.data[0]


@router_usuarios.get("/empreiteiros", response_model=List[EmpreiteiroOut])
async def listar_empreiteiros(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    resp = db.table("empreiteiros").select("*").eq("construtora_id", current_user.construtora_id).eq("ativo", True).order("razao_social").execute()
    return resp.data or []


@router_usuarios.post("/empreiteiros", response_model=EmpreiteiroOut, status_code=201)
async def criar_empreiteiro(
    payload: EmpreiteiroCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    data = payload.model_dump(exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("empreiteiros").insert(data).execute()
    return resp.data[0]


@router_usuarios.put("/empreiteiros/{empreiteiro_id}", response_model=EmpreiteiroOut)
async def atualizar_empreiteiro(
    empreiteiro_id: UUID,
    payload: EmpreiteiroUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente")
    data = payload.model_dump(exclude_none=True)
    resp = db.table("empreiteiros").update(data).eq("id", str(empreiteiro_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Empreiteiro")
    return resp.data[0]


@router_usuarios.get("/colaboradores", response_model=List[ColaboradorOut])
async def listar_colaboradores(
    empreiteiro_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("colaboradores").select("*").eq("construtora_id", current_user.construtora_id).eq("ativo", True)
    if empreiteiro_id:
        q = q.eq("empreiteiro_id", str(empreiteiro_id))
    resp = q.order("nome").execute()
    return resp.data or []


@router_usuarios.post("/colaboradores", response_model=ColaboradorOut, status_code=201)
async def criar_colaborador(
    payload: ColaboradorCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    data = payload.model_dump(exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("colaboradores").insert(data).execute()
    return resp.data[0]


# ─── ALMOXARIFADO ────────────────────────────────────────────

@router_almox.get("")
async def listar_validacoes(
    obra_id: UUID = Query(...),
    status: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("almoxarifado_validacoes").select("*").eq("obra_id", str(obra_id)).eq("construtora_id", current_user.construtora_id)
    if status:
        q = q.eq("status", status)
    resp = q.order("criado_em", desc=True).execute()
    return resp.data or []


@router_almox.post("", status_code=201)
async def solicitar_validacao(
    payload: dict,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    payload["construtora_id"] = str(current_user.construtora_id)
    payload["criado_por"] = current_user.user_id
    resp = db.table("almoxarifado_validacoes").insert(payload).execute()
    return resp.data[0]


@router_almox.put("/{validacao_id}")
async def responder_validacao(
    validacao_id: UUID,
    payload: dict,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "almoxarife", "engenheiro")
    from datetime import datetime
    payload["validado_por"] = current_user.user_id
    payload["validado_em"] = datetime.utcnow().isoformat()
    resp = db.table("almoxarifado_validacoes").update(payload).eq("id", str(validacao_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Validação")
    return resp.data[0]


# ─── DIÁRIO DE OBRA ──────────────────────────────────────────

@router_diario.get("")
async def listar_diarios(
    obra_id: UUID = Query(...),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("diario_obra").select("*").eq("obra_id", str(obra_id)).eq("construtora_id", current_user.construtora_id)
    if data_inicio:
        q = q.gte("data", str(data_inicio))
    if data_fim:
        q = q.lte("data", str(data_fim))
    resp = q.order("data", desc=True).execute()
    return resp.data or []


@router_diario.get("/{obra_id}/{data_str}")
async def obter_diario(
    obra_id: UUID,
    data_str: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    resp = db.table("diario_obra").select(
        "*, diario_atividades(*), diario_ocorrencias(*), diario_equipe(*)"
    ).eq("obra_id", str(obra_id)).eq("data", data_str).maybe_single().execute()
    if not resp.data:
        raise NotFoundError("Diário de Obra")
    return resp.data


@router_diario.post("/{obra_id}/{data_str}/gerar")
async def gerar_diario(
    obra_id: UUID,
    data_str: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro", "mestre")
    resp = db.rpc("fn_gerar_diario_obra", {"p_obra_id": str(obra_id), "p_data": data_str}).execute()
    return {"detail": "Diário gerado com sucesso.", "diario_id": resp.data}


@router_diario.put("/{diario_id}/publicar")
async def publicar_diario(
    diario_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro")
    from datetime import datetime
    resp = db.table("diario_obra").update({
        "publicado": True,
        "assinado_por": current_user.user_id,
        "assinado_em": datetime.utcnow().isoformat(),
    }).eq("id", str(diario_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Diário")
    return {"detail": "Diário publicado com sucesso."}


# ─── DASHBOARD ───────────────────────────────────────────────

@router_dashboard.get("/obra/{obra_id}")
async def dashboard_obra(
    obra_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    resp = db.table("vw_dashboard_obra").select("*").eq("obra_id", str(obra_id)).eq("construtora_id", current_user.construtora_id).maybe_single().execute()
    if not resp.data:
        raise NotFoundError("Dashboard")
    return resp.data


@router_dashboard.get("/obras")
async def dashboard_obras(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    resp = db.table("vw_dashboard_obra").select("*").eq("construtora_id", current_user.construtora_id).execute()
    return resp.data or []


@router_dashboard.get("/obra/{obra_id}/estrutura")
async def dashboard_estrutura(
    obra_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    resp = db.table("vw_progresso_estrutura").select("*").eq("obra_id", str(obra_id)).execute()
    return resp.data or []
