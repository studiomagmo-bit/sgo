from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from app.schemas.base import (
    SGOBase, StatusInspecao, StatusPendencia,
    StatusContrato, StatusMedicao, StatusEquipamento,
    OrigemEquipamento
)


# ─── INSPEÇÃO ────────────────────────────────────────────────
class InspecaoCreate(SGOBase):
    atividade_id: UUID
    obra_id: UUID
    inspetor_id: Optional[UUID] = None
    observacoes: Optional[str] = None


class InspecaoUpdate(SGOBase):
    status: Optional[StatusInspecao] = None
    observacoes: Optional[str] = None
    inspetor_id: Optional[UUID] = None
    data_inspecao: Optional[datetime] = None


class InspecaoOut(SGOBase):
    id: UUID
    atividade_id: UUID
    obra_id: UUID
    construtora_id: UUID
    inspetor_id: Optional[UUID] = None
    status: StatusInspecao
    observacoes: Optional[str] = None
    data_solicitacao: datetime
    data_inspecao: Optional[datetime] = None
    libera_medicao: bool
    criado_em: datetime


# ─── PENDÊNCIA ───────────────────────────────────────────────
class PendenciaCreate(SGOBase):
    atividade_id: UUID
    obra_id: UUID
    inspecao_id: Optional[UUID] = None
    responsavel_id: Optional[UUID] = None
    descricao: str
    prazo: Optional[date] = None


class PendenciaUpdate(SGOBase):
    status: Optional[StatusPendencia] = None
    responsavel_id: Optional[UUID] = None
    prazo: Optional[date] = None
    observacao_correcao: Optional[str] = None
    observacao_validacao: Optional[str] = None


class PendenciaOut(SGOBase):
    id: UUID
    inspecao_id: Optional[UUID] = None
    atividade_id: UUID
    obra_id: UUID
    construtora_id: UUID
    responsavel_id: Optional[UUID] = None
    descricao: str
    status: StatusPendencia
    prazo: Optional[date] = None
    corrigida_em: Optional[datetime] = None
    validada_em: Optional[datetime] = None
    criado_em: datetime


# ─── CONTRATO ────────────────────────────────────────────────
class ContratoItemBase(SGOBase):
    descricao: str
    unidade: str
    quantidade: Decimal
    valor_unit: Decimal
    servico_id: Optional[UUID] = None


class ContratoItemCreate(ContratoItemBase):
    pass


class ContratoItemUpdate(SGOBase):
    descricao: Optional[str] = None
    unidade: Optional[str] = None
    quantidade: Optional[Decimal] = None
    valor_unit: Optional[Decimal] = None


class ContratoItemOut(ContratoItemBase):
    id: UUID
    contrato_id: UUID
    valor_total: Decimal
    criado_em: datetime


class ContratoCreate(SGOBase):
    obra_id: UUID
    empreiteiro_id: UUID
    numero: Optional[str] = None
    descricao: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim_prev: Optional[date] = None
    valor_total: Optional[Decimal] = None
    observacoes: Optional[str] = None
    itens: Optional[List[ContratoItemCreate]] = []


class ContratoUpdate(SGOBase):
    numero: Optional[str] = None
    descricao: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim_prev: Optional[date] = None
    valor_total: Optional[Decimal] = None
    status: Optional[StatusContrato] = None
    observacoes: Optional[str] = None


class ContratoOut(SGOBase):
    id: UUID
    construtora_id: UUID
    obra_id: UUID
    empreiteiro_id: UUID
    numero: Optional[str] = None
    descricao: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim_prev: Optional[date] = None
    valor_total: Optional[Decimal] = None
    status: StatusContrato
    criado_em: datetime
    itens: List[ContratoItemOut] = []


# ─── MEDIÇÃO ─────────────────────────────────────────────────
class BancoMedicaoCreate(SGOBase):
    atividade_id: UUID
    contrato_item_id: Optional[UUID] = None
    inspecao_id: Optional[UUID] = None
    descricao: str
    unidade: str
    quantidade_prev: Decimal
    quantidade_exec: Decimal
    valor_unit: Decimal
    observacoes: Optional[str] = None


class BancoMedicaoOut(BancoMedicaoCreate):
    id: UUID
    medicao_id: UUID
    construtora_id: UUID
    valor_total: Decimal
    status: str
    aprovado_por: Optional[UUID] = None
    aprovado_em: Optional[datetime] = None
    criado_em: datetime


class MedicaoCreate(SGOBase):
    contrato_id: UUID
    obra_id: UUID
    empreiteiro_id: UUID
    numero: int
    periodo_inicio: date
    periodo_fim: date
    observacoes: Optional[str] = None
    itens: Optional[List[BancoMedicaoCreate]] = []


class MedicaoUpdate(SGOBase):
    status: Optional[StatusMedicao] = None
    valor_desconto: Optional[Decimal] = None
    observacoes: Optional[str] = None


class MedicaoOut(SGOBase):
    id: UUID
    construtora_id: UUID
    obra_id: UUID
    contrato_id: UUID
    empreiteiro_id: UUID
    numero: int
    periodo_inicio: date
    periodo_fim: date
    status: StatusMedicao
    valor_bruto: Decimal
    valor_desconto: Decimal
    valor_liquido: Decimal
    aprovada_em: Optional[datetime] = None
    criado_em: datetime
    itens: List[BancoMedicaoOut] = []


# ─── EQUIPAMENTO ─────────────────────────────────────────────
class EquipamentoCreate(SGOBase):
    nome: str
    descricao: Optional[str] = None
    codigo_patrimonial: Optional[str] = None
    modelo: Optional[str] = None
    fabricante: Optional[str] = None
    ano_fabricacao: Optional[int] = None
    origem: OrigemEquipamento = OrigemEquipamento.construtora
    empreiteiro_id: Optional[UUID] = None


class EquipamentoUpdate(SGOBase):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[StatusEquipamento] = None
    ativo: Optional[bool] = None


class EquipamentoOut(EquipamentoCreate):
    id: UUID
    construtora_id: UUID
    status: StatusEquipamento
    ativo: bool
    criado_em: datetime


class AlocacaoCreate(SGOBase):
    obra_id: UUID
    equipamento_id: UUID
    atividade_id: Optional[UUID] = None
    data_inicio: date
    data_fim_prev: Optional[date] = None
    observacoes: Optional[str] = None


class AlocacaoOut(AlocacaoCreate):
    id: UUID
    status: StatusEquipamento
    data_fim_real: Optional[date] = None
    criado_em: datetime
