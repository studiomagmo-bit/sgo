from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator
from enum import Enum


# ─── Base ────────────────────────────────────────────────────
class SGOBase(BaseModel):
    class Config:
        from_attributes = True
        populate_by_name = True


class PaginatedResponse(SGOBase):
    items: list[Any]
    total: int
    page: int
    page_size: int
    pages: int


# ─── Enums ───────────────────────────────────────────────────
class PerfilConstrutora(str, Enum):
    administrador = "administrador"
    diretor       = "diretor"
    gerente       = "gerente"
    engenheiro    = "engenheiro"
    mestre        = "mestre"
    pcp           = "pcp"
    almoxarife    = "almoxarife"


class PerfilEmpreiteiro(str, Enum):
    administrador = "administrador"
    encarregado   = "encarregado"
    colaborador   = "colaborador"


class TipoObra(str, Enum):
    horizontal = "horizontal"
    vertical   = "vertical"
    avulsa     = "avulsa"


class StatusObra(str, Enum):
    planejamento  = "planejamento"
    em_andamento  = "em_andamento"
    pausada       = "pausada"
    concluida     = "concluida"
    cancelada     = "cancelada"


class StatusAtividade(str, Enum):
    planejada     = "planejada"
    em_andamento  = "em_andamento"
    concluida     = "concluida"
    bloqueada     = "bloqueada"
    cancelada     = "cancelada"


class PrioridadeAtividade(str, Enum):
    baixa   = "baixa"
    media   = "media"
    alta    = "alta"
    critica = "critica"


class TipoProducao(str, Enum):
    producao = "producao"
    hora     = "hora"
    diaria   = "diaria"


class TipoApontamento(str, Enum):
    producao = "producao"
    hora     = "hora"
    diaria   = "diaria"


class MotivoAusencia(str, Enum):
    falta     = "falta"
    atestado  = "atestado"
    folga     = "folga"
    ferias    = "ferias"
    demissao  = "demissao"


class CategoriaImpedimento(str, Enum):
    material    = "material"
    mao_de_obra = "mao_de_obra"
    equipamento = "equipamento"
    projeto     = "projeto"
    cliente     = "cliente"
    clima       = "clima"
    outro       = "outro"


class StatusImpedimento(str, Enum):
    aberto       = "aberto"
    em_resolucao = "em_resolucao"
    resolvido    = "resolvido"


class StatusInspecao(str, Enum):
    aguardando             = "aguardando"
    aprovada               = "aprovada"
    aprovada_com_ressalvas = "aprovada_com_ressalvas"
    reprovada              = "reprovada"


class StatusPendencia(str, Enum):
    criada      = "criada"
    em_correcao = "em_correcao"
    corrigida   = "corrigida"
    validada    = "validada"
    cancelada   = "cancelada"


class StatusContrato(str, Enum):
    ativo     = "ativo"
    pausado   = "pausado"
    encerrado = "encerrado"
    cancelado = "cancelado"


class StatusMedicao(str, Enum):
    aberta   = "aberta"
    fechada  = "fechada"
    aprovada = "aprovada"
    paga     = "paga"


class StatusEquipamento(str, Enum):
    disponivel = "disponivel"
    reservado  = "reservado"
    em_uso     = "em_uso"
    manutencao = "manutencao"
    inativo    = "inativo"


class OrigemEquipamento(str, Enum):
    construtora = "construtora"
    empreiteiro = "empreiteiro"


class TipoEstrutura(str, Enum):
    setor         = "setor"
    bloco         = "bloco"
    torre         = "torre"
    pavimento     = "pavimento"
    unidade       = "unidade"
    servico_avulso = "servico_avulso"


# ─── AUTH ────────────────────────────────────────────────────
class LoginRequest(SGOBase):
    email: EmailStr
    password: str


class TokenResponse(SGOBase):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UsuarioOut"


# ─── USUARIO ─────────────────────────────────────────────────
class UsuarioBase(SGOBase):
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    perfil: Optional[PerfilConstrutora] = None


class UsuarioCreate(UsuarioBase):
    password: str
    construtora_id: Optional[UUID] = None


class UsuarioUpdate(SGOBase):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    perfil: Optional[PerfilConstrutora] = None
    ativo: Optional[bool] = None


class UsuarioOut(UsuarioBase):
    id: UUID
    construtora_id: Optional[UUID] = None
    avatar_url: Optional[str] = None
    ativo: bool
    criado_em: datetime


# ─── EMPREITEIRO ─────────────────────────────────────────────
class EmpreiteiroBase(SGOBase):
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None
    responsavel: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None


class EmpreiteiroCreate(EmpreiteiroBase):
    pass


class EmpreiteiroUpdate(SGOBase):
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None
    responsavel: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    ativo: Optional[bool] = None


class EmpreiteiroOut(EmpreiteiroBase):
    id: UUID
    construtora_id: UUID
    ativo: bool
    criado_em: datetime


# ─── COLABORADOR ─────────────────────────────────────────────
class ColaboradorBase(SGOBase):
    nome: str
    cpf: Optional[str] = None
    funcao: Optional[str] = None
    telefone: Optional[str] = None


class ColaboradorCreate(ColaboradorBase):
    empreiteiro_id: UUID


class ColaboradorUpdate(SGOBase):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    funcao: Optional[str] = None
    telefone: Optional[str] = None
    ativo: Optional[bool] = None


class ColaboradorOut(ColaboradorBase):
    id: UUID
    empreiteiro_id: UUID
    construtora_id: UUID
    foto_url: Optional[str] = None
    ativo: bool
    criado_em: datetime
