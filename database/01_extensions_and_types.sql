-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 01 - EXTENSÕES E TIPOS CUSTOMIZADOS
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

-- Perfis de usuário da construtora
CREATE TYPE perfil_construtora AS ENUM (
  'administrador',
  'diretor',
  'gerente',
  'engenheiro',
  'mestre',
  'pcp',
  'almoxarife'
);

-- Perfis de usuário empreiteiro
CREATE TYPE perfil_empreiteiro AS ENUM (
  'administrador',
  'encarregado',
  'colaborador'
);

-- Tipo de obra
CREATE TYPE tipo_obra AS ENUM (
  'horizontal',
  'vertical',
  'avulsa'
);

-- Status da obra
CREATE TYPE status_obra AS ENUM (
  'planejamento',
  'em_andamento',
  'pausada',
  'concluida',
  'cancelada'
);

-- Tipo de nó da estrutura da obra
CREATE TYPE tipo_estrutura AS ENUM (
  'setor',
  'bloco',
  'torre',
  'pavimento',
  'unidade',
  'servico_avulso'
);

-- Tipo de apontamento do serviço
CREATE TYPE tipo_apontamento AS ENUM (
  'producao',
  'hora',
  'diaria'
);

-- Status de atividade PCP
CREATE TYPE status_atividade AS ENUM (
  'planejada',
  'em_andamento',
  'concluida',
  'bloqueada',
  'cancelada'
);

-- Prioridade de atividade
CREATE TYPE prioridade_atividade AS ENUM (
  'baixa',
  'media',
  'alta',
  'critica'
);

-- Tipo de produção
CREATE TYPE tipo_producao AS ENUM (
  'producao',
  'hora',
  'diaria'
);

-- Motivo de ausência no efetivo diário
CREATE TYPE motivo_ausencia AS ENUM (
  'falta',
  'atestado',
  'folga',
  'ferias',
  'demissao'
);

-- Categoria de impedimento
CREATE TYPE categoria_impedimento AS ENUM (
  'material',
  'mao_de_obra',
  'equipamento',
  'projeto',
  'cliente',
  'clima',
  'outro'
);

-- Status de impedimento
CREATE TYPE status_impedimento AS ENUM (
  'aberto',
  'em_resolucao',
  'resolvido'
);

-- Status de disponibilidade do almoxarifado
CREATE TYPE status_almoxarifado AS ENUM (
  'disponivel',
  'indisponivel',
  'parcial'
);

-- Status do equipamento
CREATE TYPE status_equipamento AS ENUM (
  'disponivel',
  'reservado',
  'em_uso',
  'manutencao',
  'inativo'
);

-- Origem do equipamento
CREATE TYPE origem_equipamento AS ENUM (
  'construtora',
  'empreiteiro'
);

-- Status de inspeção
CREATE TYPE status_inspecao AS ENUM (
  'aguardando',
  'aprovada',
  'aprovada_com_ressalvas',
  'reprovada'
);

-- Status de pendência
CREATE TYPE status_pendencia AS ENUM (
  'criada',
  'em_correcao',
  'corrigida',
  'validada',
  'cancelada'
);

-- Status do contrato
CREATE TYPE status_contrato AS ENUM (
  'ativo',
  'pausado',
  'encerrado',
  'cancelado'
);

-- Status de medição
CREATE TYPE status_medicao AS ENUM (
  'aberta',
  'fechada',
  'aprovada',
  'paga'
);

-- Status do banco de medição
CREATE TYPE status_banco_medicao AS ENUM (
  'pendente',
  'aprovado',
  'reprovado'
);

-- Tipo de foto
CREATE TYPE tipo_foto AS ENUM (
  'atividade',
  'pendencia',
  'inspecao',
  'diario',
  'equipamento'
);
