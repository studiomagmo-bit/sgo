from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from app.schemas.base import (
    SGOBase, MotivoAusencia, TipoProducao,
    CategoriaImpedimento, StatusImpedimento
)


# ─── EFETIVO DIÁRIO ──────────────────────────────────────────
class EfetivoColaboradorCreate(SGOBase):
    colaborador_id: UUID
    presente: bool = True
    motivo_ausencia: Optional[MotivoAusencia] = None
    observacao: Optional[str] = None
    hora_entrada: Optional[time] = None
    hora_saida: Optional[time] = None


class EfetivoColaboradorOut(EfetivoColaboradorCreate):
    id: UUID
    efetivo_id: UUID
    criado_em: datetime


class EfetivoCreate(SGOBase):
    obra_id: UUID
    empreiteiro_id: UUID
    data: date
    encarregado_id: Optional[UUID] = None
    observacoes: Optional[str] = None
    colaboradores: List[EfetivoColaboradorCreate] = []


class EfetivoUpdate(SGOBase):
    encarregado_id: Optional[UUID] = None
    observacoes: Optional[str] = None


class EfetivoOut(SGOBase):
    id: UUID
    obra_id: UUID
    construtora_id: UUID
    empreiteiro_id: UUID
    data: date
    encarregado_id: Optional[UUID] = None
    observacoes: Optional[str] = None
    criado_em: datetime
    colaboradores: List[EfetivoColaboradorOut] = []

    @property
    def total_presentes(self) -> int:
        return sum(1 for c in self.colaboradores if c.presente)

    @property
    def total_ausentes(self) -> int:
        return sum(1 for c in self.colaboradores if not c.presente)


# ─── PRODUÇÃO ────────────────────────────────────────────────
class ProducaoIndividualCreate(SGOBase):
    colaborador_id: UUID
    percentual: Decimal
    quantidade: Decimal


class ProducaoIndividualOut(ProducaoIndividualCreate):
    id: UUID
    producao_id: UUID
    criado_em: datetime


class ProducaoCreate(SGOBase):
    atividade_id: UUID
    obra_id: UUID
    empreiteiro_id: Optional[UUID] = None
    efetivo_id: Optional[UUID] = None
    data: date
    tipo: TipoProducao = TipoProducao.producao
    quantidade: Decimal
    unidade: Optional[str] = None
    observacoes: Optional[str] = None
    individual: Optional[List[ProducaoIndividualCreate]] = []


class ProducaoUpdate(SGOBase):
    quantidade: Optional[Decimal] = None
    observacoes: Optional[str] = None


class ProducaoOut(SGOBase):
    id: UUID
    atividade_id: UUID
    obra_id: UUID
    construtora_id: UUID
    empreiteiro_id: Optional[UUID] = None
    efetivo_id: Optional[UUID] = None
    data: date
    tipo: TipoProducao
    quantidade: Decimal
    unidade: Optional[str] = None
    observacoes: Optional[str] = None
    criado_em: datetime
    individual: List[ProducaoIndividualOut] = []


# ─── IMPEDIMENTO ─────────────────────────────────────────────
class ImpedimentoCreate(SGOBase):
    atividade_id: UUID
    obra_id: UUID
    categoria: CategoriaImpedimento
    descricao: str
    responsavel_id: Optional[UUID] = None
    data_ocorrencia: Optional[date] = None


class ImpedimentoUpdate(SGOBase):
    categoria: Optional[CategoriaImpedimento] = None
    descricao: Optional[str] = None
    status: Optional[StatusImpedimento] = None
    responsavel_id: Optional[UUID] = None
    data_resolucao: Optional[date] = None
    resolucao: Optional[str] = None


class ImpedimentoOut(SGOBase):
    id: UUID
    atividade_id: UUID
    obra_id: UUID
    construtora_id: UUID
    categoria: CategoriaImpedimento
    descricao: str
    status: StatusImpedimento
    responsavel_id: Optional[UUID] = None
    data_ocorrencia: date
    data_resolucao: Optional[date] = None
    resolucao: Optional[str] = None
    criado_em: datetime
