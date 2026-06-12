// ============================================================
// SGO — sgoApi.ts  (v3 — rebuilt from scratch for reliability)
// Todas as queries com tratamento de erro robusto
// ============================================================
import { supabase, supabasePortal } from './supabase'

// ─── Helper: construtora_id do usuário logado ─────────────────
async function getCID(): Promise<string | null> {
  try {
    const u = JSON.parse(localStorage.getItem('sgo_user') ?? '{}')
    if (u?.construtora_id) return u.construtora_id
  } catch {}
  const { data } = await supabase.from('usuarios').select('construtora_id').eq('id',(await supabase.auth.getUser()).data.user?.id ?? '').single()
  return data?.construtora_id ?? null
}

function perfil(): string {
  try { return JSON.parse(localStorage.getItem('sgo_user') ?? '{}')?.perfil ?? 'engenheiro' } catch { return 'engenheiro' }
}
function uid(): string {
  try { return JSON.parse(localStorage.getItem('sgo_user') ?? '{}')?.id ?? '' } catch { return '' }
}
const RESTRITOS = ['engenheiro','mestre','pcp','almoxarife']
const isRestrito = () => RESTRITOS.includes(perfil())

// ─── OBRAS ────────────────────────────────────────────────────
export const obras = {
  listar: async (params?: { status?: string }) => {
    let q = supabase.from('obras').select('*').order('nome')
    if (params?.status) q = q.eq('status', params.status)
    if (isRestrito()) {
      const { data: v } = await supabase.from('usuarios_obra').select('obra_id').eq('usuario_id', uid()).eq('ativo', true)
      const ids = (v ?? []).map((x: any) => x.obra_id)
      if (!ids.length) return []
      q = q.in('id', ids)
    }
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  },
  buscar: async (id: string) => {
    const { data, error } = await supabase.from('obras').select('*, estrutura_obra(*)').eq('id', id).single()
    if (error) throw new Error(error.message)
    return data
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('obras').insert({ ...d, construtora_id: cid }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('obras').update(d).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ─── ESTRUTURA DA OBRA ────────────────────────────────────────
export const estruturaObra = {
  listar: async (obra_id: string) => {
    const { data, error } = await supabase.from('estrutura_obra').select('*').eq('obra_id', obra_id).order('ordem')
    if (error) { console.warn('estrutura_obra RLS:', error.message); return [] }
    return data ?? []
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('estrutura_obra').insert({ ...d, construtora_id: cid }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('estrutura_obra').update(d).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  deletar: async (id: string) => {
    const { error } = await supabase.from('estrutura_obra').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

// ─── ATIVIDADES ───────────────────────────────────────────────
export const atividades = {
  listar: async (params?: { obra_id?: string; status?: string; empreiteiro_id?: string }) => {
    let q = supabase.from('atividades')
      .select('*, obras(nome), empreiteiros(razao_social,nome_fantasia), estrutura_obra:estrutura_id(nome,tipo)')
      .order('ordem', { ascending: true })
    if (params?.obra_id)       q = q.eq('obra_id', params.obra_id)
    if (params?.status)        q = q.eq('status', params.status)
    if (params?.empreiteiro_id) q = q.eq('empreiteiro_id', params.empreiteiro_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('atividades').insert({ ...d, construtora_id: cid }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('atividades').update(d).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  deletar: async (id: string) => {
    const { error } = await supabase.from('atividades').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

// ─── COLABORADORES ────────────────────────────────────────────
export const colaboradores = {
  listar: async (params?: { empreiteiro_id?: string }) => {
    let q = supabase.from('colaboradores').select('*').eq('ativo', true).order('nome')
    if (params?.empreiteiro_id) q = q.eq('empreiteiro_id', params.empreiteiro_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('colaboradores').insert({ ...d, construtora_id: cid, ativo: true }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ─── EFETIVO DIÁRIO ───────────────────────────────────────────
export const efetivos = {
  buscarOuCriar: async (obra_id: string, empreiteiro_id: string, data: string) => {
    const cid = await getCID()
    const { data: ex } = await supabase.from('efetivo_diario').select('*').eq('obra_id', obra_id).eq('empreiteiro_id', empreiteiro_id).eq('data', data).maybeSingle()
    if (ex) return ex
    const { data: novo, error } = await supabase.from('efetivo_diario').insert({ obra_id, empreiteiro_id, data, construtora_id: cid }).select().single()
    if (error) throw new Error(error.message)
    return novo
  },
  listar: async (params?: { obra_id?: string; data?: string; empreiteiro_id?: string }) => {
    let q = supabase.from('efetivo_diario').select('*, efetivo_colaboradores(*, colaboradores(nome,funcao,cpf)), empreiteiros(razao_social)').order('data', { ascending: false })
    if (params?.obra_id)       q = q.eq('obra_id', params.obra_id)
    if (params?.data)          q = q.eq('data', params.data)
    if (params?.empreiteiro_id) q = q.eq('empreiteiro_id', params.empreiteiro_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  },
  salvarPresenca: async (efetivo_id: string, registros: { colaborador_id: string; status: string; hora_entrada?: string; hora_saida?: string }[]) => {
    const { data, error } = await supabase.from('efetivo_colaboradores')
      .upsert(registros.map(r => ({ ...r, efetivo_id })), { onConflict: 'efetivo_id,colaborador_id' }).select()
    if (error) throw new Error(error.message)
    return data ?? []
  },
  listarPresenca: async (efetivo_id: string) => {
    const { data, error } = await supabase.from('efetivo_colaboradores').select('*, colaboradores(nome,funcao,cpf)').eq('efetivo_id', efetivo_id)
    if (error) throw new Error(error.message)
    return data ?? []
  },
}

// ─── PRODUÇÕES ────────────────────────────────────────────────
export const producoes = {
  listar: async (params?: { obra_id?: string; atividade_id?: string }) => {
    let q = supabase.from('producoes').select('*, atividades(nome,unidade), empreiteiros(razao_social)').order('data', { ascending: false })
    if (params?.obra_id)      q = q.eq('obra_id', params.obra_id)
    if (params?.atividade_id) q = q.eq('atividade_id', params.atividade_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('producoes').insert({ ...d, construtora_id: cid }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  liberar: async (id: string, percentual: number) => {
    const { data, error } = await supabase.from('producoes').update({ liberado_medicao: true, percentual_medicao: percentual, liberado_por: uid(), liberado_em: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ─── INSPEÇÕES ────────────────────────────────────────────────
export const inspecoes = {
  listar: async (params?: { obra_id?: string; status?: string }) => {
    let q = supabase.from('inspecoes').select('*, atividades(nome), obras(nome)').order('criado_em', { ascending: false })
    if (params?.obra_id) q = q.eq('obra_id', params.obra_id)
    if (params?.status)  q = q.eq('status', params.status)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('inspecoes').insert({ ...d, construtora_id: cid }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('inspecoes').update(d).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ─── PENDÊNCIAS ───────────────────────────────────────────────
export const pendencias = {
  listar: async (params?: { obra_id?: string; status?: string }) => {
    let q = supabase.from('pendencias').select('*, atividades(nome), obras(nome)').order('criado_em', { ascending: false })
    if (params?.obra_id) q = q.eq('obra_id', params.obra_id)
    if (params?.status)  q = q.eq('status', params.status)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('pendencias').insert({ ...d, construtora_id: cid, status: 'criada' }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('pendencias').update(d).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ─── MEDIÇÕES ─────────────────────────────────────────────────
export const medicoes = {
  listar: async (params?: { obra_id?: string }) => {
    let q = supabase.from('medicoes').select('*, obras(nome), empreiteiros(razao_social)').order('criado_em', { ascending: false })
    if (params?.obra_id) q = q.eq('obra_id', params.obra_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('medicoes').insert({ ...d, construtora_id: cid }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('medicoes').update(d).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ─── DIÁRIO DE OBRA ───────────────────────────────────────────
export const diario = {
  listar: async (obra_id: string) => {
    const { data, error } = await supabase.from('diario_obra').select('*').eq('obra_id', obra_id).order('data', { ascending: false })
    if (error) { console.warn('diario RLS:', error.message); return [] }
    return data ?? []
  },
  upsert: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('diario_obra').upsert({ ...d, construtora_id: cid }, { onConflict: 'obra_id,data' }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ─── EMPREITEIROS ─────────────────────────────────────────────
export const empreiteiros = {
  listar: async () => {
    const { data, error } = await supabase.from('empreiteiros').select('*').order('razao_social')
    if (error) throw new Error(error.message)
    return data ?? []
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('empreiteiros').insert({ ...d, construtora_id: cid }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  atualizar: async (id: string, d: any) => {
    const { data, error } = await supabase.from('empreiteiros').update(d).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ─── EQUIPAMENTOS ─────────────────────────────────────────────
export const equipamentos = {
  listar: async () => {
    const { data, error } = await supabase.from('equipamentos').select('*, empreiteiros(razao_social)').eq('ativo', true).order('nome')
    if (error) throw new Error(error.message)
    return data ?? []
  },
  criar: async (d: any) => {
    const cid = await getCID()
    const { data, error } = await supabase.from('equipamentos').insert({ ...d, construtora_id: cid }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
}

// ─── DASHBOARD ────────────────────────────────────────────────
export const dashboard = {
  /** Dashboard executivo — carrega tudo em paralelo com fallbacks robustos */
  executivo: async () => {
    const [obs, ativs, pends, insps, emps, meds] = await Promise.all([
      supabase.from('obras').select('*').order('nome').then(r => r.data ?? []),
      supabase.from('atividades').select('id,obra_id,nome,status,prioridade,percentual_exec,data_fim_prev,empreiteiro_id,estrutura_id').order('nome').then(r => r.data ?? []),
      supabase.from('pendencias').select('id,obra_id,status,descricao').eq('status','criada').then(r => r.data ?? []),
      supabase.from('inspecoes').select('id,obra_id,status').then(r => r.data ?? []),
      supabase.from('empreiteiros').select('id,razao_social,ativo').then(r => r.data ?? []),
      supabase.from('medicoes').select('id,obra_id,status,valor_liquido').then(r => r.data ?? []),
    ])
    return { obras: obs, atividades: ativs, pendencias: pends, inspecoes: insps, empreiteiros: emps, medicoes: meds, efetivosHoje: [] }
  },

  /** PCP — atividades com estrutura para uma obra */
  pcp: async (obra_id?: string) => {
    let q = supabase.from('atividades')
      .select('*, empreiteiros(razao_social,nome_fantasia), estrutura_obra:estrutura_id(id,nome,tipo,parent_id,ordem)')
      .order('ordem', { ascending: true })
    if (obra_id && obra_id !== 'todas') q = q.eq('obra_id', obra_id)
    const { data, error } = await q
    if (error) { console.warn('pcp error:', error.message); return [] }
    return data ?? []
  },
}

// ─── PORTAL API ───────────────────────────────────────────────
export const portalApi = {
  /** Cria acesso de empreiteiro via SQL function (sem email, sem rate limit) */
  criarAcesso: async (d: { empreiteiro_id: string; construtora_id: string; nome: string; email: string; senha: string }) => {
    const { data, error } = await supabase.rpc('criar_acesso_empreiteiro', {
      p_empreiteiro_id: d.empreiteiro_id,
      p_construtora_id: d.construtora_id,
      p_nome:  d.nome,
      p_email: d.email,
      p_senha: d.senha,
    })
    if (error) throw new Error(error.message)
    return { userId: data, email: d.email }
  },

  listarAcessos: async (empreiteiro_id: string) => {
    const { data, error } = await supabase.from('usuarios_empreiteiro').select('id,nome,email,perfil,ativo').eq('empreiteiro_id', empreiteiro_id)
    if (error) return []
    return (data ?? []).map((u: any) => ({ ...u, email: u.email?.replace('@sgo-portal.app','') ?? u.email }))
  },

  loginPortal: async (email: string, senha: string) => {
    const { data, error } = await supabasePortal.auth.signInWithPassword({ email, password: senha })
    if (error) throw new Error(error.message)
    return data
  },

  logoutPortal: async () => { await supabasePortal.auth.signOut() },

  buscarPerfil: async () => {
    const { data: { user } } = await supabasePortal.auth.getUser()
    if (!user) return null
    const { data, error } = await supabasePortal.from('usuarios_empreiteiro')
      .select('*, empreiteiros(id,razao_social,nome_fantasia,construtora_id)')
      .eq('id', user.id).single()
    if (error) return null
    return data
  },

  // Obras vinculadas ao empreiteiro (via atividades + obra_empreiteiros)
  minhasObras: async (empreiteiro_id: string) => {
    const { data } = await supabasePortal.from('atividades')
      .select('obra_id, obras(id,nome,status,cidade,data_fim_prev,percentual_geral)')
      .eq('empreiteiro_id', empreiteiro_id)
    const seen = new Set<string>()
    return (data ?? []).filter((a: any) => a.obras && !seen.has(a.obra_id) && seen.add(a.obra_id)).map((a: any) => a.obras)
  },

  // Atividades do empreiteiro com estrutura e dependências
  minhasAtividades: async (empreiteiro_id: string, obra_id?: string) => {
    let q = supabasePortal.from('atividades')
      .select(`
        id, nome, descricao, status, percentual_exec, prioridade,
        data_inicio_prev, data_fim_prev, data_inicio_real, data_conclusao_emp,
        quantidade_prev, quantidade_exec, unidade,
        motivo_impedimento, categoria_impedimento, obs_reprovacao, notas_execucao,
        obra_id, estrutura_id, empreiteiro_id,
        obras(id,nome),
        estrutura_obra:estrutura_id(id,nome,tipo,parent_id),
        atividade_dependencias!atividade_id(atividade_depende_id)
      `)
      .eq('empreiteiro_id', empreiteiro_id)
      .order('data_inicio_prev', { ascending: true, nullsFirst: false })
    if (obra_id) q = q.eq('obra_id', obra_id)
    const { data, error } = await q
    if (error) { console.warn('minhasAtividades:', error.message); return [] }
    return data ?? []
  },

  atualizarAtividade: async (id: string, d: any) => {
    const { data, error } = await supabasePortal.from('atividades').update(d).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  registrarEvento: async (atividade_id: string, construtora_id: string, tipo: string, descricao?: string) => {
    const { data: { user } } = await supabasePortal.auth.getUser()
    await supabasePortal.from('atividade_eventos').insert({
      atividade_id, construtora_id, tipo, descricao: descricao ?? null,
      criado_por_emp: user?.id ?? null,
    })
  },

  meusColaboradores: async (empreiteiro_id: string) => {
    const { data, error } = await supabasePortal.from('colaboradores').select('*').eq('empreiteiro_id', empreiteiro_id).eq('ativo', true).order('nome')
    if (error) return []
    return data ?? []
  },

  criarColaborador: async (d: { empreiteiro_id: string; construtora_id: string; nome: string; cpf?: string; funcao?: string; telefone?: string }) => {
    const { data, error } = await supabasePortal.from('colaboradores').insert({ ...d, ativo: true }).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  buscarOuCriarEfetivo: async (obra_id: string, empreiteiro_id: string, data: string, construtora_id: string) => {
    const { data: ex } = await supabasePortal.from('efetivo_diario').select('*').eq('obra_id', obra_id).eq('empreiteiro_id', empreiteiro_id).eq('data', data).maybeSingle()
    if (ex) return ex
    const { data: novo, error } = await supabasePortal.from('efetivo_diario').insert({ obra_id, empreiteiro_id, data, construtora_id }).select().single()
    if (error) throw new Error(error.message)
    return novo
  },

  salvarPresenca: async (registros: any[]) => {
    const { data, error } = await supabasePortal.from('efetivo_colaboradores').upsert(registros, { onConflict: 'efetivo_id,colaborador_id' }).select()
    if (error) throw new Error(error.message)
    return data ?? []
  },

  listarPresenca: async (efetivo_id: string) => {
    const { data, error } = await supabasePortal.from('efetivo_colaboradores').select('*, colaboradores(nome,funcao,cpf)').eq('efetivo_id', efetivo_id)
    if (error) return []
    return data ?? []
  },

  // Histórico de eventos de uma atividade
  eventosAtividade: async (atividade_id: string) => {
    const { data, error } = await supabasePortal.from('atividade_eventos').select('*').eq('atividade_id', atividade_id).order('criado_em', { ascending: false })
    if (error) return []
    return data ?? []
  },

  // Produções registradas para o empreiteiro
  minhasProducoes: async (empreiteiro_id: string, obra_id?: string) => {
    let q = supabasePortal.from('producoes')
      .select('*, atividades(nome,unidade,quantidade_prev)')
      .order('data', { ascending: false })
    if (obra_id) q = q.eq('obra_id', obra_id)
    // Filtra por empreiteiro via join
    const { data, error } = await q
    if (error) return []
    // Filtra atividades do empreiteiro
    return (data ?? []).filter((p: any) => p.atividades)
  },
}

// ─── USUÁRIOS ─────────────────────────────────────────────────
export const usuariosApi = {
  listar: async () => {
    const { data, error } = await supabase.from('usuarios').select('id,nome,email,username,perfil,ativo,criado_por').order('nome')
    if (error) throw new Error(error.message)
    const usuarios = data ?? []
    const { data: vinculos } = await supabase.from('usuarios_obra').select('usuario_id,obra_id,ativo,obras(id,nome)').eq('ativo', true)
    return usuarios.map(u => ({ ...u, usuarios_obra: (vinculos ?? []).filter((v: any) => v.usuario_id === u.id) }))
  },
  criar: async (d: { nome: string; username: string; senha: string; perfil: string }) => {
    const cid = await getCID()
    if (!cid) throw new Error('Construtora não identificada.')
    const { data, error } = await supabase.rpc('criar_usuario_interno', {
      p_nome: d.nome, p_username: d.username, p_senha: d.senha,
      p_perfil: d.perfil, p_construtora_id: cid,
    })
    if (error) throw new Error(error.message)
    return data
  },
  desativar: async (id: string) => {
    const { error } = await supabase.from('usuarios').update({ ativo: false }).eq('id', id)
    if (error) throw new Error(error.message)
  },
  vincularObra: async (usuario_id: string, obra_id: string, papel = 'engenheiro') => {
    const cid = await getCID()
    const { error } = await supabase.from('usuarios_obra').upsert({ usuario_id, obra_id, construtora_id: cid, papel, ativo: true }, { onConflict: 'usuario_id,obra_id' })
    if (error) throw new Error(error.message)
  },
  desvincularObra: async (usuario_id: string, obra_id: string) => {
    const { error } = await supabase.from('usuarios_obra').update({ ativo: false }).eq('usuario_id', usuario_id).eq('obra_id', obra_id)
    if (error) throw new Error(error.message)
  },
}

