from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.core.auth import get_current_user, CurrentUser
from app.core.database import get_supabase_admin
from app.core.exceptions import NotFoundError
from app.schemas.pcp import (
    TemplateCreate, TemplateUpdate, TemplateOut,
    AtividadeCreate, AtividadeUpdate, AtividadeOut,
    AplicarTemplateRequest, DependenciaCreate,
)

router = APIRouter(prefix="/pcp", tags=["PCP"])


# ─── TEMPLATES ───────────────────────────────────────────────

@router.get("/templates", response_model=List[TemplateOut])
async def listar_templates(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    resp = db.table("pcp_templates").select("*, pcp_template_itens(*)").eq("construtora_id", current_user.construtora_id).eq("ativo", True).execute()
    result = []
    for t in (resp.data or []):
        t["itens"] = t.pop("pcp_template_itens", [])
        result.append(t)
    return result


@router.post("/templates", response_model=TemplateOut, status_code=201)
async def criar_template(
    payload: TemplateCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "pcp")
    itens = payload.itens or []
    data = payload.model_dump(exclude={"itens"}, exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("pcp_templates").insert(data).execute()
    template = resp.data[0]
    if itens:
        rows = [{"template_id": template["id"], **i.model_dump(exclude_none=True)} for i in itens]
        db.table("pcp_template_itens").insert(rows).execute()
    template["itens"] = itens
    return template


@router.delete("/templates/{template_id}", status_code=204)
async def deletar_template(
    template_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "pcp")
    db.table("pcp_templates").update({"ativo": False}).eq("id", str(template_id)).eq("construtora_id", current_user.construtora_id).execute()


# ─── APLICAR TEMPLATE ────────────────────────────────────────

@router.post("/templates/aplicar", status_code=201)
async def aplicar_template(
    payload: AplicarTemplateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "pcp")

    # Busca itens do template
    itens = db.table("pcp_template_itens").select("*").eq("template_id", str(payload.template_id)).order("ordem").execute()
    if not itens.data:
        raise NotFoundError("Template")

    # Busca serviços para pegar unidades
    servicos_map = {}
    for item in itens.data:
        if item.get("servico_id"):
            s = db.table("servicos").select("id, unidade, tipo_apontamento").eq("id", item["servico_id"]).maybe_single().execute()
            if s.data:
                servicos_map[item["servico_id"]] = s.data

    from datetime import date, timedelta
    data_inicio = payload.data_inicio or date.today()
    atividades = []

    for idx, item in enumerate(itens.data):
        dur = item.get("duracao_dias") or 5
        serv = servicos_map.get(item.get("servico_id"), {})
        atv = {
            "obra_id": str(payload.obra_id),
            "construtora_id": str(current_user.construtora_id),
            "nome": item["nome"],
            "descricao": item.get("descricao"),
            "servico_id": item.get("servico_id"),
            "estrutura_id": str(payload.estrutura_id) if payload.estrutura_id else None,
            "unidade": serv.get("unidade"),
            "quantidade_prev": 0,
            "data_inicio_prev": str(data_inicio + timedelta(days=idx * dur)),
            "data_fim_prev": str(data_inicio + timedelta(days=(idx + 1) * dur - 1)),
            "template_item_id": item["id"],
        }
        atividades.append({k: v for k, v in atv.items() if v is not None})

    resp = db.table("atividades").insert(atividades).execute()

    # Registra aplicação
    db.table("pcp_template_aplicacoes").insert({
        "obra_id": str(payload.obra_id),
        "template_id": str(payload.template_id),
        "estrutura_id": str(payload.estrutura_id) if payload.estrutura_id else None,
        "aplicado_por": current_user.user_id,
        "qtd_atividades": len(atividades),
    }).execute()

    return {"detail": f"{len(atividades)} atividades criadas com sucesso."}


# ─── ATIVIDADES ──────────────────────────────────────────────

@router.get("/atividades", response_model=List[AtividadeOut])
async def listar_atividades(
    obra_id: UUID = Query(...),
    status: Optional[str] = Query(None),
    estrutura_id: Optional[UUID] = Query(None),
    empreiteiro_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    q = db.table("atividades").select("*").eq("obra_id", str(obra_id)).eq("construtora_id", current_user.construtora_id)
    if status:
        q = q.eq("status", status)
    if estrutura_id:
        q = q.eq("estrutura_id", str(estrutura_id))
    if empreiteiro_id:
        q = q.eq("empreiteiro_id", str(empreiteiro_id))
    resp = q.order("data_inicio_prev").execute()
    return resp.data or []


@router.post("/atividades", response_model=AtividadeOut, status_code=201)
async def criar_atividade(
    payload: AtividadeCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro", "pcp", "mestre")
    data = payload.model_dump(exclude_none=True)
    data["construtora_id"] = str(current_user.construtora_id)
    resp = db.table("atividades").insert(data).execute()
    return resp.data[0]


@router.get("/atividades/{atividade_id}", response_model=AtividadeOut)
async def detalhar_atividade(
    atividade_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    resp = db.table("atividades").select("*").eq("id", str(atividade_id)).eq("construtora_id", current_user.construtora_id).maybe_single().execute()
    if not resp.data:
        raise NotFoundError("Atividade")
    return resp.data


@router.put("/atividades/{atividade_id}", response_model=AtividadeOut)
async def atualizar_atividade(
    atividade_id: UUID,
    payload: AtividadeUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "engenheiro", "pcp", "mestre")
    data = payload.model_dump(exclude_none=True)
    resp = db.table("atividades").update(data).eq("id", str(atividade_id)).eq("construtora_id", current_user.construtora_id).execute()
    if not resp.data:
        raise NotFoundError("Atividade")
    return resp.data[0]


@router.delete("/atividades/{atividade_id}", status_code=204)
async def cancelar_atividade(
    atividade_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "pcp")
    db.table("atividades").update({"status": "cancelada"}).eq("id", str(atividade_id)).eq("construtora_id", current_user.construtora_id).execute()


@router.post("/atividades/{atividade_id}/dependencias", status_code=201)
async def adicionar_dependencia(
    atividade_id: UUID,
    payload: DependenciaCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "pcp")
    db.table("atividade_dependencias").insert({
        "atividade_id": str(atividade_id),
        "atividade_depende_id": str(payload.atividade_depende_id),
    }).execute()
    return {"detail": "Dependência adicionada."}


@router.delete("/atividades/{atividade_id}/dependencias/{dep_id}", status_code=204)
async def remover_dependencia(
    atividade_id: UUID,
    dep_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase_admin),
):
    current_user.require_perfis("administrador", "gerente", "pcp")
    db.table("atividade_dependencias").delete().eq("atividade_id", str(atividade_id)).eq("atividade_depende_id", str(dep_id)).execute()
