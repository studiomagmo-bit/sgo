import { supabase } from './supabase'

// Helper: retorna construtora_id do usuário logado
async function getConstrutoraId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('usuarios').select('construtora_id').eq('id', user.id).single()
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

// ─── EFETIVO ──────────────────────────────────────────────────
export const efetivos = {
  listar: async (params?: any) => {
    let q = supabase.from('efetivo_diario').select('*, empreiteiros(razao_social)').order('data', { ascending: false })
    if (params?.obra_id) q = q.eq('obra_id', params.obra_id)
    if (params?.data)    q = q.eq('data', params.data)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  criar: async (d: any) => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase.from('efetivo_diario').insert({ ...d, construtora_id }).select().single()
    if (error) throw error
    return data
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
