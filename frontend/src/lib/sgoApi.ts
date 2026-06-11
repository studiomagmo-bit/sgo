import { supabase, supabaseSignup, supabasePortal } from './supabase'

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
    // Lê perfil do cache para filtrar obras por vínculo (engenheiro/mestre)
    let perfil = 'administrador'
    let uid = ''
    try {
      const cached = localStorage.getItem('sgo_user')
      if (cached) {
        const u = JSON.parse(cached)
        perfil = u?.perfil ?? 'administrador'
        uid    = u?.id ?? ''
      }
    } catch {}

    let q = supabase.from('obras').select('*').order('nome')
    if (params?.status) q = q.eq('status', params.status)

    // Perfis restritos: só obras vinculadas via usuarios_obra
    const perfisRestritos = ['engenheiro', 'mestre', 'pcp', 'almoxarife']
    if (perfisRestritos.includes(perfil) && uid) {
      const { data: vinculos } = await supabase
        .from('usuarios_obra')
        .select('obra_id')
        .eq('usuario_id', uid)
        .eq('ativo', true)
      const obraIds = (vinculos ?? []).map((v: any) => v.obra_id)
      if (obraIds.length === 0) return []
      q = q.in('id', obraIds)
    }

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
    // INSERT sem .select() para evitar erro de RLS no SELECT pós-insert
    const { error: insertErr } = await supabase
      .from('obras').insert({ ...d, construtora_id })
    if (insertErr) throw insertErr
    // Busca a obra recém-criada pela combinação nome + construtora
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('construtora_id', construtora_id)
      .eq('nome', d.nome)
      .order('criado_em', { ascending: false })
      .limit(1)
      .single()
    if (error) return { nome: d.nome, construtora_id }  // fallback silencioso
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
    let q = supabase.from('producoes').select('*, atividades(nome), obras(nome), empreiteiros(razao_social)').order('data', { ascending: false })
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
        .select('id, obra_id, status, valor_liquido'),
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

// ─── PORTAL DO EMPREITEIRO ────────────────────────────────────
export const portalApi = {
  /** Cria conta de acesso para empreiteiro sem deslogar o gestor */
  criarAcesso: async (dados: {
    empreiteiro_id: string
    construtora_id: string
    nome: string
    email: string
    senha: string
  }) => {
    // Usa cliente separado (supabaseSignup) para não deslogar o gestor
    const { data: authData, error: authErr } = await supabaseSignup.auth.signUp({
      email: dados.email,
      password: dados.senha,
    })
    if (authErr) throw authErr
    const userId = authData.user?.id
    if (!userId) throw new Error('Falha ao criar usuário de autenticação')

    // Insere perfil em usuarios_empreiteiro usando o cliente principal
    const { error: insertErr } = await supabase
      .from('usuarios_empreiteiro')
      .insert({
        id: userId,
        empreiteiro_id: dados.empreiteiro_id,
        construtora_id: dados.construtora_id,
        nome: dados.nome,
        email: dados.email,
        perfil: 'administrador',
        ativo: true,
      })
    if (insertErr) throw insertErr
    return { userId, email: dados.email }
  },

  /** Lista acessos criados para um empreiteiro */
  listarAcessos: async (empreiteiro_id: string) => {
    const { data, error } = await supabase
      .from('usuarios_empreiteiro')
      .select('id, nome, email, perfil, ativo, criado_em')
      .eq('empreiteiro_id', empreiteiro_id)
    if (error) throw error
    return data ?? []
  },

  /** Login do empreiteiro no portal (usa supabasePortal para sessão isolada) */
  loginPortal: async (email: string, senha: string) => {
    const { data, error } = await supabasePortal.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
    return data
  },

  /** Logout do portal */
  logoutPortal: async () => {
    await supabasePortal.auth.signOut()
  },

  /** Busca perfil do empreiteiro logado no portal */
  buscarPerfil: async () => {
    const { data: { user } } = await supabasePortal.auth.getUser()
    if (!user) return null
    const { data, error } = await supabasePortal
      .from('usuarios_empreiteiro')
      .select('*, empreiteiros(id, razao_social, nome_fantasia, construtora_id)')
      .eq('id', user.id)
      .single()
    if (error) return null
    return data
  },

  /** Obras vinculadas ao empreiteiro (via atividades) */
  minhasObras: async (empreiteiro_id: string) => {
    const { data, error } = await supabasePortal
      .from('atividades')
      .select('obra_id, obras(id, nome, status, percentual_geral, data_fim_prev)')
      .eq('empreiteiro_id', empreiteiro_id)
    if (error) throw error
    // Dedup por obra_id
    const seen = new Set<string>()
    return (data ?? [])
      .filter((a: any) => { if (seen.has(a.obra_id)) return false; seen.add(a.obra_id); return true })
      .map((a: any) => a.obras)
      .filter(Boolean)
  },

  /** Atividades do empreiteiro (opcionalmente filtradas por obra) */
  minhasAtividades: async (empreiteiro_id: string, obra_id?: string) => {
    let q = supabasePortal
      .from('atividades')
      .select('*, obras(nome), estrutura_obra(nome, tipo), empreiteiros(razao_social)')
      .eq('empreiteiro_id', empreiteiro_id)
      .order('data_inicio_prev', { ascending: true })
    if (obra_id) q = q.eq('obra_id', obra_id)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  /** Atualiza status/% de atividade (pelo empreiteiro) */
  atualizarAtividade: async (id: string, d: { status?: string; percentual_exec?: number; notas_execucao?: string; foto_url?: string }) => {
    const { data, error } = await supabasePortal
      .from('atividades')
      .update(d)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Colaboradores do empreiteiro */
  meusColaboradores: async (empreiteiro_id: string) => {
    const { data, error } = await supabasePortal
      .from('colaboradores')
      .select('*')
      .eq('empreiteiro_id', empreiteiro_id)
      .eq('ativo', true)
      .order('nome')
    if (error) throw error
    return data ?? []
  },

  /** Buscar ou criar efetivo_diario para o portal */
  buscarOuCriarEfetivo: async (obra_id: string, empreiteiro_id: string, data: string, construtora_id: string) => {
    const { data: existing } = await supabasePortal
      .from('efetivo_diario')
      .select('*')
      .eq('obra_id', obra_id)
      .eq('empreiteiro_id', empreiteiro_id)
      .eq('data', data)
      .maybeSingle()
    if (existing) return existing
    const { data: novo, error } = await supabasePortal
      .from('efetivo_diario')
      .insert({ obra_id, empreiteiro_id, data, construtora_id })
      .select()
      .single()
    if (error) throw error
    return novo
  },

  /** Salvar presença (lote) */
  salvarPresenca: async (registros: any[]) => {
    const { data, error } = await supabasePortal
      .from('efetivo_colaboradores')
      .upsert(registros, { onConflict: 'efetivo_id,colaborador_id' })
      .select()
    if (error) throw error
    return data ?? []
  },

  /** Listar presença do dia */
  listarPresenca: async (efetivo_id: string) => {
    const { data, error } = await supabasePortal
      .from('efetivo_colaboradores')
      .select('*, colaboradores(nome, funcao)')
      .eq('efetivo_id', efetivo_id)
    if (error) throw error
    return data ?? []
  },
}

// ─── USUÁRIOS (gestores / engenheiros criados pelo admin) ─────
export const usuariosApi = {
  /** Listar todos usuários da construtora */
  listar: async () => {
    // Tenta com join; se usuarios_obra não existir ainda (SQL 11 não rodado), cai no fallback
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, username, perfil, ativo, criado_em')
      .order('nome')
    if (error) throw error
    // Busca vínculos de obras separadamente (tolerante a falha)
    const usuarios = data ?? []
    try {
      const { data: vinculos } = await supabase
        .from('usuarios_obra')
        .select('usuario_id, obra_id, papel, ativo, obras(id, nome)')
        .eq('ativo', true)
      if (vinculos) {
        return usuarios.map(u => ({
          ...u,
          usuarios_obra: vinculos.filter(v => v.usuario_id === u.id),
        }))
      }
    } catch {}
    return usuarios.map(u => ({ ...u, usuarios_obra: [] }))
  },

  /** Criar novo usuário via RPC — sem email, sem rate limit, sem confirmação */
  criar: async (d: {
    nome: string
    username: string
    senha: string
    perfil: string
  }) => {
    const construtora_id = await getConstrutoraId()
    if (!construtora_id) throw new Error('Construtora não identificada.')

    // Chama a função criar_usuario_interno() que insere direto em auth.users
    // com email_confirmed_at = NOW() — sem envio de email, sem rate limit
    const { data: userId, error } = await supabase.rpc('criar_usuario_interno', {
      p_nome:           d.nome.trim(),
      p_username:       d.username.trim(),
      p_senha:          d.senha,
      p_perfil:         d.perfil,
      p_construtora_id: construtora_id,
    })
    if (error) throw new Error(error.message)
    // Retorna o usuário recém-criado
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    return usuario
  },

  /** Atualizar dados de um usuário */
  atualizar: async (id: string, d: Partial<{ nome: string; perfil: string; ativo: boolean; username: string }>) => {
    const { data, error } = await supabase
      .from('usuarios')
      .update(d)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Desativar usuário (soft delete) */
  desativar: async (id: string) => {
    const { error } = await supabase.from('usuarios').update({ ativo: false }).eq('id', id)
    if (error) throw error
  },

  /** Vincular usuário a uma obra */
  vincularObra: async (usuario_id: string, obra_id: string, papel = 'engenheiro') => {
    const construtora_id = await getConstrutoraId()
    const { data, error } = await supabase
      .from('usuarios_obra')
      .upsert({ usuario_id, obra_id, construtora_id, papel, ativo: true }, { onConflict: 'usuario_id,obra_id' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Desvincular usuário de uma obra */
  desvincularObra: async (usuario_id: string, obra_id: string) => {
    const { error } = await supabase
      .from('usuarios_obra')
      .update({ ativo: false })
      .match({ usuario_id, obra_id })
    if (error) throw error
  },

  /** Listar obras vinculadas a um usuário */
  obrasDoUsuario: async (usuario_id: string) => {
    const { data, error } = await supabase
      .from('usuarios_obra')
      .select('*, obras(id, nome, status)')
      .eq('usuario_id', usuario_id)
      .eq('ativo', true)
    if (error) throw error
    return data ?? []
  },
}
