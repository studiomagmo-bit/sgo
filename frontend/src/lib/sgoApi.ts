import { supabase } from './supabase'

// Helper: retorna construtora_id do usuário logado
// Usa o perfil cacheado no localStorage (carregado no login) para evitar
// query extra que pode falhar por RLS e retornar null
async function getConstrutoraId(): Promise<string | null> {
  // 1. Tenta cache (mais rápido e confiável)
  try {
    const cached = localStorage.getItem('sgo_user')
    if (cached) {
      const u = JSON.parse(cached)
      if (u?.construtora_id) return u.construtora_id
    }
  } catch {}

  // 2. Fallback: consulta direta ao banco
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('usuarios')
    .select('construtora_id')
    .eq('id', user.id)
    .single()
  return data?.construtora_id ?? null
}

// ─── OBRAS ───────────────────────────────────────────────────
export const obras = {
  listar: async (params?: any) => {
    let q = supabase.from('obras').select('*').order('nome')
    if (params?.status) q = q.eq('status', params.status)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  detalhar: async (id: string) => {
    const { data, error } = await supabase.from('obras').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase.from('obras').insert({ ...d, construtora_id }).select().single()
    if (error) throw error
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('obras').update(d).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ─── ESTRUTURA DA OBRA ────────────────────────────────────────
export const estruturaObra = {
  listar: async (obra_id: string) => {
    const { data, error } = await supabase
      .from('estrutura_obra')
      .select('*')
      .eq('obra_id', obra_id)
      .order('ordem')
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const { data, error } = await supabase
      .from('estrutura_obra')
      .insert(d)
      .select()
      .single()
    if (error) throw error
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase
      .from('estrutura_obra')
      .update(d)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
  excluir: async (id: string) => {
    const { error } = await supabase
      .from('estrutura_obra')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// ─── ATIVIDADES (PCP) ─────────────────────────────────────────
export const atividades = {
  listar: async (params?: any) => {
    let q = supabase.from('atividades').select('*, obras(nome)').order('criado_em', { ascending: false })
    if (params?.obra_id) q = q.eq('obra_id', params.obra_id)
    if (params?.status)  q = q.eq('status', params.status)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase.from('atividades').insert({ ...d, construtora_id }).select().single()
    if (error) throw error
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('atividades').update(d).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ─── COLABORADORES ────────────────────────────────────────────
export const colaboradores = {
  listar: async (empreiteiro_id?: string) => {
    let q = supabase
      .from('colaboradores')
      .select('*, empreiteiros(razao_social)')
      .eq('ativo', true)
      .order('nome')
    if (empreiteiro_id) q = q.eq('empreiteiro_id', empreiteiro_id)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase
      .from('colaboradores')
      .insert({ ...d, construtora_id })
      .select()
      .single()
    if (error) throw error
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase
      .from('colaboradores')
      .update(d)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
  excluir: async (id: string) => {
    // Soft delete: marca como inativo
    const { error } = await supabase
      .from('colaboradores')
      .update({ ativo: false })
      .eq('id', id)
    if (error) throw error
  },
}

// ─── EFETIVO ──────────────────────────────────────────────────
export const efetivos = {
  listar: async (params?: any) => {
    let q = supabase
      .from('efetivo_diario')
      .select('*, empreiteiros(razao_social)')
      .order('data', { ascending: false })
    if (params?.obra_id)      q = q.eq('obra_id', params.obra_id)
    if (params?.empreiteiro_id) q = q.eq('empreiteiro_id', params.empreiteiro_id)
    if (params?.data)         q = q.eq('data', params.data)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  buscarOuCriar: async (obra_id: string, empreiteiro_id: string, data: string) => {
    const construtora_id = await getConstrutoraId()
    // Tenta buscar registro existente
    const { data: existing } = await supabase
      .from('efetivo_diario')
      .select('*')
      .eq('obra_id', obra_id)
      .eq('empreiteiro_id', empreiteiro_id)
      .eq('data', data)
      .maybeSingle()
    if (existing) return existing
    // Cria novo
    const { data: novo, error } = await supabase
      .from('efetivo_diario')
      .insert({ obra_id, empreiteiro_id, data, construtora_id })
      .select()
      .single()
    if (error) throw error
    return novo
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase
      .from('efetivo_diario')
      .insert({ ...d, construtora_id })
      .select()
      .single()
    if (error) throw error
    return data
  },
  // ── Presença individual (efetivo_colaboradores) ───────────
  listarPresenca: async (efetivo_id: string) => {
    const { data, error } = await supabase
      .from('efetivo_colaboradores')
      .select('*, colaboradores(nome, funcao, foto_url)')
      .eq('efetivo_id', efetivo_id)
    if (error) throw error
    return data ?? []
  },
  salvarPresenca: async (efetivo_id: string, colaborador_id: string, d: any) => {
    // Upsert: cria ou atualiza presença do colaborador no dia
    const { data, error } = await supabase
      .from('efetivo_colaboradores')
      .upsert(
        { efetivo_id, colaborador_id, ...d },
        { onConflict: 'efetivo_id,colaborador_id' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },
  salvarPresencaLote: async (registros: any[]) => {
    const { data, error } = await supabase
      .from('efetivo_colaboradores')
      .upsert(registros, { onConflict: 'efetivo_id,colaborador_id' })
      .select()
    if (error) throw error
    return data ?? []
  },
}

// ─── PRODUÇÕES ────────────────────────────────────────────────
export const producoes = {
  listar: async (params?: any) => {
    let q = supabase.from('producoes').select('*, atividades(nome), obras(nome)').order('data', { ascending: false })
    if (params?.obra_id)     q = q.eq('obra_id', params.obra_id)
    if (params?.atividade_id) q = q.eq('atividade_id', params.atividade_id)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase.from('producoes').insert({ ...d, construtora_id }).select().single()
    if (error) throw error
    return data
  },
}

// ─── INSPEÇÕES ────────────────────────────────────────────────
export const inspecoes = {
  listar: async (params?: any) => {
    let q = supabase.from('inspecoes').select('*, atividades(nome), obras(nome)').order('criado_em', { ascending: false })
    if (params?.obra_id) q = q.eq('obra_id', params.obra_id)
    if (params?.status)  q = q.eq('status', params.status)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase.from('inspecoes').insert({ ...d, construtora_id }).select().single()
    if (error) throw error
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('inspecoes').update(d).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ─── PENDÊNCIAS ───────────────────────────────────────────────
export const pendencias = {
  listar: async (params?: any) => {
    let q = supabase.from('pendencias').select('*, atividades(nome), obras(nome)').order('criado_em', { ascending: false })
    if (params?.obra_id) q = q.eq('obra_id', params.obra_id)
    if (params?.status)  q = q.eq('status', params.status)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase.from('pendencias').insert({ ...d, construtora_id }).select().single()
    if (error) throw error
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('pendencias').update(d).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ─── MEDIÇÕES ─────────────────────────────────────────────────
export const medicoes = {
  listar: async (params?: any) => {
    let q = supabase.from('medicoes').select('*, obras(nome), empreiteiros(razao_social)').order('criado_em', { ascending: false })
    if (params?.obra_id) q = q.eq('obra_id', params.obra_id)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase.from('medicoes').insert({ ...d, construtora_id }).select().single()
    if (error) throw error
    return data
  },
}

// ─── DIÁRIO ───────────────────────────────────────────────────
export const diario = {
  listar: async (params?: any) => {
    let q = supabase.from('diario_obra').select('*, obras(nome)').order('data', { ascending: false })
    if (params?.obra_id) q = q.eq('obra_id', params.obra_id)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
}

// ─── EMPREITEIROS ─────────────────────────────────────────────
export const empreiteiros = {
  listar: async () => {
    const { data, error } = await supabase.from('empreiteiros').select('*').order('razao_social')
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase.from('empreiteiros').insert({ ...d, construtora_id }).select().single()
    if (error) throw error
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('empreiteiros').update(d).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ─── EQUIPAMENTOS ─────────────────────────────────────────────
export const equipamentos = {
  listar: async () => {
    const { data, error } = await supabase.from('equipamentos').select('*').order('nome')
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase.from('equipamentos').insert({ ...d, construtora_id }).select().single()
    if (error) throw error
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('equipamentos').update(d).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ─── DASHBOARD ────────────────────────────────────────────────
export const dashboard = {
  /** Dashboard Executivo: busca tudo em paralelo */
  executivo: async () => {
    const hoje = new Date().toISOString().split('T')[0]
    const [
      { data: obrasList },
      { data: atividadesList },
      { data: pendenciasList },
      { data: inspecoesList },
      { data: efetivosHoje },
      { data: empreiteirosList },
      { data: medicoesList },
    ] = await Promise.all([
      supabase.from('obras')
        .select('id, nome, tipo, status, percentual_geral, data_inicio, data_fim_prev, ativa')
        .eq('ativa', true)
        .order('nome'),
      supabase.from('atividades')
        .select('id, obra_id, status, percentual_exec, prioridade, data_fim_prev'),
      supabase.from('pendencias')
        .select('id, obra_id, status')
        .in('status', ['criada', 'em_correcao']),
      supabase.from('inspecoes')
        .select('id, obra_id, status'),
      supabase.from('efetivo_diario')
        .select('id, obra_id, empreiteiro_id')
        .eq('data', hoje),
      supabase.from('empreiteiros')
        .select('id, razao_social, ativo')
        .eq('ativo', true),
      supabase.from('medicoes')
        .select('id, obra_id, status, valor_total'),
    ])
    return {
      obras:          obrasList       ?? [],
      atividades:     atividadesList  ?? [],
      pendencias:     pendenciasList  ?? [],
      inspecoes:      inspecoesList   ?? [],
      efetivosHoje:   efetivosHoje    ?? [],
      empreiteiros:   empreiteirosList ?? [],
      medicoes:       medicoesList    ?? [],
    }
  },

  /** Dashboard PCP: atividades com estrutura + empreiteiro para análise de desvio */
  pcp: async (obra_id?: string) => {
    let q = supabase
      .from('atividades')
      .select('*, empreiteiros(razao_social), estrutura_obra(nome, tipo)')
      .order('data_inicio_prev', { ascending: true })
    if (obra_id) q = q.eq('obra_id', obra_id)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  /** Legado — mantido para compatibilidade */
  obras: async () => {
    const { data, error } = await supabase
      .from('obras')
      .select('id, nome, tipo, status, percentual_geral, ativa')
      .eq('ativa', true)
      .order('nome')
    if (error) throw error
    return data ?? []
  },
}
