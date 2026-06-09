// ============================================================
// SGO – TypeScript Types
// ============================================================

export type UUID = string

// ─── Enums ───────────────────────────────────────────────────
export type PerfilConstrutora =
  | 'administrador' | 'diretor' | 'gerente'
  | 'engenheiro'   | 'mestre'  | 'pcp' | 'almoxarife'

export type PerfilEmpreiteiro = 'administrador' | 'encarregado' | 'colaborador'
export type TipoObra          = 'horizontal' | 'vertical' | 'avulsa'
export type StatusObra        = 'planejamento' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada'
export type TipoEstrutura     = 'setor' | 'bloco' | 'torre' | 'pavimento' | 'unidade' | 'servico_avulso'
export type StatusAtividade   = 'planejada' | 'em_andamento' | 'concluida' | 'bloqueada' | 'cancelada'
export type PrioridadeAtividade = 'baixa' | 'media' | 'alta' | 'critica'
export type TipoProducao      = 'producao' | 'hora' | 'diaria'
export type MotivoAusencia    = 'falta' | 'atestado' | 'folga' | 'ferias' | 'demissao'
export type CategoriaImpedimento = 'material' | 'mao_de_obra' | 'equipamento' | 'projeto' | 'cliente' | 'clima' | 'outro'
export type StatusImpedimento = 'aberto' | 'em_resolucao' | 'resolvido'
export type StatusInspecao    = 'aguardando' | 'aprovada' | 'aprovada_com_ressalvas' | 'reprovada'
export type StatusPendencia   = 'criada' | 'em_correcao' | 'corrigida' | 'validada' | 'cancelada'
export type StatusContrato    = 'ativo' | 'pausado' | 'encerrado' | 'cancelado'
export type StatusMedicao     = 'aberta' | 'fechada' | 'aprovada' | 'paga'
export type StatusEquipamento = 'disponivel' | 'reservado' | 'em_uso' | 'manutencao' | 'inativo'

// ─── Entidades ───────────────────────────────────────────────
export interface Usuario {
  id: UUID
  nome: string
  email: string
  telefone?: string
  avatar_url?: string
  perfil?: PerfilConstrutora
  construtora_id?: UUID
  ativo: boolean
  criado_em: string
}

export interface Construtora {
  id: UUID
  nome: string
  cnpj?: string
  logo_url?: string
  ativa: boolean
}

export interface Empreiteiro {
  id: UUID
  construtora_id: UUID
  razao_social: string
  nome_fantasia?: string
  cnpj?: string
  responsavel?: string
  telefone?: string
  email?: string
  ativo: boolean
  criado_em: string
}

export interface Colaborador {
  id: UUID
  empreiteiro_id: UUID
  construtora_id: UUID
  nome: string
  cpf?: string
  funcao?: string
  telefone?: string
  foto_url?: string
  ativo: boolean
}

export interface Obra {
  id: UUID
  construtora_id: UUID
  nome: string
  tipo: TipoObra
  descricao?: string
  endereco?: string
  cidade?: string
  estado?: string
  data_inicio?: string
  data_fim_prev?: string
  data_fim_real?: string
  area_total?: number
  status: StatusObra
  foto_capa_url?: string
  ativa: boolean
  criado_em: string
  // computed (detalhada)
  estruturas?: EstruturaObra[]
  total_atividades?: number
  percentual_geral?: number
}

export interface EstruturaObra {
  id: UUID
  obra_id: UUID
  parent_id?: UUID
  tipo: TipoEstrutura
  nome: string
  codigo?: string
  descricao?: string
  ordem: number
  area?: number
  ativo: boolean
  criado_em: string
  filhos?: EstruturaObra[]
}

export interface Servico {
  id: UUID
  construtora_id: UUID
  nome: string
  descricao?: string
  unidade: string
  tipo_apontamento: 'producao' | 'hora' | 'diaria'
  ativo: boolean
  materiais?: ServicoMaterial[]
}

export interface ServicoMaterial {
  id: UUID
  servico_id: UUID
  material: string
  unidade: string
  quantidade?: number
}

export interface Atividade {
  id: UUID
  obra_id: UUID
  construtora_id: UUID
  estrutura_id?: UUID
  servico_id?: UUID
  empreiteiro_id?: UUID
  responsavel_id?: UUID
  nome: string
  descricao?: string
  local?: string
  quantidade_prev: number
  quantidade_exec: number
  unidade?: string
  data_inicio_prev?: string
  data_fim_prev?: string
  data_inicio_real?: string
  data_fim_real?: string
  status: StatusAtividade
  prioridade: PrioridadeAtividade
  percentual_exec: number
  bloqueada: boolean
  libera_medicao: boolean
  criado_em: string
  atualizado_em: string
}

export interface EfetivoColaborador {
  id: UUID
  efetivo_id: UUID
  colaborador_id: UUID
  presente: boolean
  motivo_ausencia?: MotivoAusencia
  observacao?: string
  hora_entrada?: string
  hora_saida?: string
}

export interface EfetivoDiario {
  id: UUID
  obra_id: UUID
  construtora_id: UUID
  empreiteiro_id: UUID
  data: string
  encarregado_id?: UUID
  observacoes?: string
  criado_em: string
  colaboradores: EfetivoColaborador[]
}

export interface Producao {
  id: UUID
  atividade_id: UUID
  obra_id: UUID
  construtora_id: UUID
  empreiteiro_id?: UUID
  efetivo_id?: UUID
  data: string
  tipo: TipoProducao
  quantidade: number
  unidade?: string
  observacoes?: string
  criado_em: string
  individual?: ProducaoIndividual[]
}

export interface ProducaoIndividual {
  id: UUID
  producao_id: UUID
  colaborador_id: UUID
  percentual: number
  quantidade: number
}

export interface Impedimento {
  id: UUID
  atividade_id: UUID
  obra_id: UUID
  construtora_id: UUID
  categoria: CategoriaImpedimento
  descricao: string
  status: StatusImpedimento
  responsavel_id?: UUID
  data_ocorrencia: string
  data_resolucao?: string
  resolucao?: string
  criado_em: string
}

export interface Inspecao {
  id: UUID
  atividade_id: UUID
  obra_id: UUID
  construtora_id: UUID
  inspetor_id?: UUID
  status: StatusInspecao
  observacoes?: string
  data_solicitacao: string
  data_inspecao?: string
  libera_medicao: boolean
  criado_em: string
}

export interface Pendencia {
  id: UUID
  inspecao_id?: UUID
  atividade_id: UUID
  obra_id: UUID
  construtora_id: UUID
  responsavel_id?: UUID
  descricao: string
  status: StatusPendencia
  prazo?: string
  corrigida_em?: string
  validada_em?: string
  criado_em: string
}

export interface ContratoItem {
  id: UUID
  contrato_id: UUID
  servico_id?: UUID
  descricao: string
  unidade: string
  quantidade: number
  valor_unit: number
  valor_total: number
}

export interface Contrato {
  id: UUID
  construtora_id: UUID
  obra_id: UUID
  empreiteiro_id: UUID
  numero?: string
  descricao?: string
  data_inicio?: string
  data_fim_prev?: string
  valor_total?: number
  status: StatusContrato
  criado_em: string
  itens: ContratoItem[]
}

export interface BancoMedicao {
  id: UUID
  medicao_id: UUID
  atividade_id: UUID
  descricao: string
  unidade: string
  quantidade_prev: number
  quantidade_exec: number
  valor_unit: number
  valor_total: number
  status: string
  criado_em: string
}

export interface Medicao {
  id: UUID
  construtora_id: UUID
  obra_id: UUID
  contrato_id: UUID
  empreiteiro_id: UUID
  numero: number
  periodo_inicio: string
  periodo_fim: string
  status: StatusMedicao
  valor_bruto: number
  valor_desconto: number
  valor_liquido: number
  aprovada_em?: string
  criado_em: string
  itens: BancoMedicao[]
}

export interface Equipamento {
  id: UUID
  construtora_id: UUID
  empreiteiro_id?: UUID
  origem: 'construtora' | 'empreiteiro'
  nome: string
  descricao?: string
  codigo_patrimonial?: string
  modelo?: string
  fabricante?: string
  status: StatusEquipamento
  ativo: boolean
  criado_em: string
}

export interface DiarioObra {
  id: UUID
  obra_id: UUID
  construtora_id: UUID
  data: string
  efetivo_previsto: number
  efetivo_presente: number
  efetivo_ausente: number
  total_producoes: number
  total_impedimentos: number
  total_pendencias: number
  total_inspecoes: number
  total_fotos: number
  descricao_geral?: string
  publicado: boolean
  criado_em: string
}

// ─── Dashboard ───────────────────────────────────────────────
export interface DashboardObra {
  obra_id: UUID
  obra_nome: string
  tipo: TipoObra
  status: StatusObra
  total_atividades: number
  atividades_concluidas: number
  atividades_em_andamento: number
  atividades_bloqueadas: number
  percentual_geral: number
  efetivo_hoje: number
  impedimentos_abertos: number
  inspecoes_aguardando: number
  inspecoes_aprovadas: number
  pendencias_abertas: number
}

// ─── API ─────────────────────────────────────────────────────
export interface ApiError {
  detail: string
  erros?: { campo: string; mensagem: string }[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}
