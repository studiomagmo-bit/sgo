from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from app.schemas.base import SGOBase, TipoObra, StatusObra, TipoEstrutura, TipoApontamento


# ─── OBRA ────────────────────────────────────────────────────
class ObraBase(SGOBase):
    nome: str
    tipo: TipoObra = TipoObra.avulsa
    descricao: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim_prev: Optional[date] = None
    area_total: Optional[Decimal] = None
    gerente_id: Optional[UUID] = None
    engenheiro_id: Optional[UUID] = None


class ObraCreate(ObraBase):
    pass


class ObraUpdate(SGOBase):
    nome: Optional[str] = None
    tipo: Optional[TipoObra] = None
    descricao: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim_prev: Optional[date] = None
    data_fim_real: Optional[date] = None
    area_total: Optional[Decimal] = None
    status: Optional[StatusObra] = None
    gerente_id: Optional[UUID] = None
    engenheiro_id: Optional[UUID] = None
    ativa: Optional[bool] = None


class ObraOut(ObraBase):
    id: UUID
    construtora_id: UUID
    status: StatusObra
    data_fim_real: Optional[date] = None
    foto_capa_url: Optional[str] = None
    ativa: bool
    criado_em: datetime


class ObraDetalhada(ObraOut):
    estruturas: List["EstruturaOut"] = []
    total_atividades: Optional[int] = None
    percentual_geral: Optional[float] = None


# ─── ESTRUTURA DA OBRA ───────────────────────────────────────
class EstruturaBase(SGOBase):
    tipo: TipoEstrutura
    nome: str
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    ordem: int = 0
    area: Optional[Decimal] = None


class EstruturaCreate(EstruturaBase):
    obra_id: UUID
    parent_id: Optional[UUID] = None


class EstruturaUpdate(SGOBase):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    ordem: Optional[int] = None
    area: Optional[Decimal] = None
    ativo: Optional[bool] = None


class EstruturaOut(EstruturaBase):
    id: UUID
    obra_id: UUID
    parent_id: Optional[UUID] = None
    ativo: bool
    criado_em: datetime
    filhos: List["EstruturaOut"] = []


EstruturaOut.model_rebuild()
ObraDetalhada.model_rebuild()


# ─── SERVIÇO ─────────────────────────────────────────────────
class ServicoMaterialBase(SGOBase):
    material: str
    unidade: str
    quantidade: Optional[Decimal] = None


class ServicoMaterialCreate(ServicoMaterialBase):
    pass


class ServicoMaterialOut(ServicoMaterialBase):
    id: UUID
    servico_id: UUID


class ServicoBase(SGOBase):
    nome: str
    descricao: Optional[str] = None
    unidade: str
    tipo_apontamento: TipoApontamento = TipoApontamento.producao


class ServicoCreate(ServicoBase):
    materiais: Optional[List[ServicoMaterialCreate]] = []


class ServicoUpdate(SGOBase):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    unidade: Optional[str] = None
    tipo_apontamento: Optional[TipoApontamento] = None
    ativo: Optional[bool] = None


class ServicoOut(ServicoBase):
    id: UUID
    construtora_id: UUID
    ativo: bool
    criado_em: datetime
    materiais: List[ServicoMaterialOut] = []
