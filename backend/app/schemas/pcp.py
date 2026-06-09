from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from app.schemas.base import (
    SGOBase, StatusAtividade, PrioridadeAtividade
)


# ─── TEMPLATE PCP ────────────────────────────────────────────
class TemplateItemBase(SGOBase):
    nome: str
    descricao: Optional[str] = None
    ordem: int = 0
    duracao_dias: Optional[int] = None
    servico_id: Optional[UUID] = None
    parent_item_id: Optional[UUID] = None


class TemplateItemCreate(TemplateItemBase):
    pass


class TemplateItemOut(TemplateItemBase):
    id: UUID
    template_id: UUID


class TemplateBase(SGOBase):
    nome: str
    descricao: Optional[str] = None
    tipo_obra: Optional[str] = None


class TemplateCreate(TemplateBase):
    itens: Optional[List[TemplateItemCreate]] = []


class TemplateUpdate(SGOBase):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class TemplateOut(TemplateBase):
    id: UUID
    construtora_id: UUID
    ativo: bool
    criado_em: datetime
    itens: List[TemplateItemOut] = []


# ─── ATIVIDADE ───────────────────────────────────────────────
class AtividadeBase(SGOBase):
    nome: str
    descricao: Optional[str] = None
    local: Optional[str] = None
    quantidade_prev: Decimal = Decimal("0")
    unidade: Optional[str] = None
    data_inicio_prev: Optional[date] = None
    data_fim_prev: Optional[date] = None
    prioridade: PrioridadeAtividade = PrioridadeAtividade.media
    estrutura_id: Optional[UUID] = None
    servico_id: Optional[UUID] = None
    empreiteiro_id: Optional[UUID] = None
    responsavel_id: Optional[UUID] = None


class AtividadeCreate(AtividadeBase):
    obra_id: UUID


class AtividadeUpdate(SGOBase):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    local: Optional[str] = None
    quantidade_prev: Optional[Decimal] = None
    unidade: Optional[str] = None
    data_inicio_prev: Optional[date] = None
    data_fim_prev: Optional[date] = None
    data_inicio_real: Optional[date] = None
    data_fim_real: Optional[date] = None
    prioridade: Optional[PrioridadeAtividade] = None
    status: Optional[StatusAtividade] = None
    estrutura_id: Optional[UUID] = None
    empreiteiro_id: Optional[UUID] = None
    responsavel_id: Optional[UUID] = None


class AtividadeOut(AtividadeBase):
    id: UUID
    obra_id: UUID
    construtora_id: UUID
    status: StatusAtividade
    quantidade_exec: Decimal
    percentual_exec: Decimal
    bloqueada: bool
    libera_medicao: bool
    data_inicio_real: Optional[date] = None
    data_fim_real: Optional[date] = None
    criado_em: datetime
    atualizado_em: datetime


class AplicarTemplateRequest(SGOBase):
    template_id: UUID
    obra_id: UUID
    estrutura_id: Optional[UUID] = None
    data_inicio: Optional[date] = None


class DependenciaCreate(SGOBase):
    atividade_id: UUID
    atividade_depende_id: UUID
