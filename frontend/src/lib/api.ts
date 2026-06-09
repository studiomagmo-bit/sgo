import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: injeta token ───────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sgo_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor: trata 401 ─────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('sgo_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Helpers typed ───────────────────────────────────────────
export const get  = <T>(url: string, params?: object) => api.get<T>(url, { params }).then(r => r.data)
export const post = <T>(url: string, data?: object)   => api.post<T>(url, data).then(r => r.data)
export const put  = <T>(url: string, data?: object)   => api.put<T>(url, data).then(r => r.data)
export const del  = (url: string)                     => api.delete(url).then(r => r.data)

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login:  (email: string, password: string) => post<{ access_token: string; user: any; expires_in: number }>('/auth/login', { email, password }),
  logout: ()                                 => post('/auth/logout'),
  me:     ()                                 => get<any>('/auth/me'),
}

// ─── Obras ────────────────────────────────────────────────────
export const obrasApi = {
  listar:    (params?: object)    => get<any[]>('/obras', params),
  criar:     (data: object)       => post<any>('/obras', data),
  detalhar:  (id: string)         => get<any>(`/obras/${id}`),
  atualizar: (id: string, d: any) => put<any>(`/obras/${id}`, d),
  desativar: (id: string)         => del(`/obras/${id}`),

  estrutura: {
    listar:    (obraId: string, params?: object) => get<any[]>(`/obras/${obraId}/estrutura`, params),
    criar:     (obraId: string, d: any)          => post<any>(`/obras/${obraId}/estrutura`, d),
    atualizar: (obraId: string, id: string, d: any) => put<any>(`/obras/${obraId}/estrutura/${id}`, d),
  },
}

// ─── Serviços ─────────────────────────────────────────────────
export const servicosApi = {
  listar:    ()               => get<any[]>('/servicos'),
  criar:     (d: any)         => post<any>('/servicos', d),
  atualizar: (id: string, d: any) => put<any>(`/servicos/${id}`, d),
}

// ─── PCP ──────────────────────────────────────────────────────
export const pcpApi = {
  templates: {
    listar:  ()                   => get<any[]>('/pcp/templates'),
    criar:   (d: any)             => post<any>('/pcp/templates', d),
    deletar: (id: string)         => del(`/pcp/templates/${id}`),
    aplicar: (d: any)             => post('/pcp/templates/aplicar', d),
  },
  atividades: {
    listar:    (params: object)           => get<any[]>('/pcp/atividades', params),
    criar:     (d: any)                   => post<any>('/pcp/atividades', d),
    detalhar:  (id: string)               => get<any>(`/pcp/atividades/${id}`),
    atualizar: (id: string, d: any)       => put<any>(`/pcp/atividades/${id}`, d),
    cancelar:  (id: string)               => del(`/pcp/atividades/${id}`),
    addDep:    (id: string, d: any)       => post(`/pcp/atividades/${id}/dependencias`, d),
    removeDep: (id: string, depId: string)=> del(`/pcp/atividades/${id}/dependencias/${depId}`),
  },
}

// ─── Operacional ─────────────────────────────────────────────
export const efetivosApi = {
  listar:    (params: object)           => get<any[]>('/efetivo', params),
  criar:     (d: any)                   => post<any>('/efetivo', d),
  atualizar: (id: string, d: any)       => put<any>(`/efetivo/${id}`, d),
}

export const producoesApi = {
  listar:    (params: object)           => get<any[]>('/producoes', params),
  criar:     (d: any)                   => post<any>('/producoes', d),
  atualizar: (id: string, d: any)       => put<any>(`/producoes/${id}`, d),
  deletar:   (id: string)               => del(`/producoes/${id}`),
}

export const impedimentosApi = {
  listar:    (params: object)           => get<any[]>('/impedimentos', params),
  criar:     (d: any)                   => post<any>('/impedimentos', d),
  atualizar: (id: string, d: any)       => put<any>(`/impedimentos/${id}`, d),
}

// ─── Qualidade ────────────────────────────────────────────────
export const inspecoesApi = {
  listar:    (params: object)           => get<any[]>('/inspecoes', params),
  criar:     (d: any)                   => post<any>('/inspecoes', d),
  atualizar: (id: string, d: any)       => put<any>(`/inspecoes/${id}`, d),
}

export const pendenciasApi = {
  listar:    (params: object)           => get<any[]>('/pendencias', params),
  criar:     (d: any)                   => post<any>('/pendencias', d),
  atualizar: (id: string, d: any)       => put<any>(`/pendencias/${id}`, d),
}

// ─── Contratos e Medições ─────────────────────────────────────
export const contratosApi = {
  listar:    (params?: object)          => get<any[]>('/contratos', params),
  criar:     (d: any)                   => post<any>('/contratos', d),
  atualizar: (id: string, d: any)       => put<any>(`/contratos/${id}`, d),
}

export const medicoesApi = {
  listar:    (params?: object)          => get<any[]>('/medicoes', params),
  criar:     (d: any)                   => post<any>('/medicoes', d),
  atualizar: (id: string, d: any)       => put<any>(`/medicoes/${id}`, d),
}

// ─── Equipamentos ─────────────────────────────────────────────
export const equipamentosApi = {
  listar:    (params?: object)          => get<any[]>('/equipamentos', params),
  criar:     (d: any)                   => post<any>('/equipamentos', d),
  atualizar: (id: string, d: any)       => put<any>(`/equipamentos/${id}`, d),
  alocar:    (d: any)                   => post<any>('/equipamentos/alocacoes', d),
}

// ─── Almoxarifado ─────────────────────────────────────────────
export const almoxarifadoApi = {
  listar:     (params: object)          => get<any[]>('/almoxarifado', params),
  solicitar:  (d: any)                  => post<any>('/almoxarifado', d),
  responder:  (id: string, d: any)      => put<any>(`/almoxarifado/${id}`, d),
}

// ─── Diário ───────────────────────────────────────────────────
export const diarioApi = {
  listar:    (params: object)           => get<any[]>('/diario', params),
  obter:     (obraId: string, data: string) => get<any>(`/diario/${obraId}/${data}`),
  gerar:     (obraId: string, data: string) => post(`/diario/${obraId}/${data}/gerar`),
  publicar:  (id: string)               => put(`/diario/${id}/publicar`),
}

// ─── Dashboard ────────────────────────────────────────────────
export const dashboardApi = {
  obra:      (id: string)  => get<any>(`/dashboard/obra/${id}`),
  obras:     ()            => get<any[]>('/dashboard/obras'),
  estrutura: (id: string)  => get<any[]>(`/dashboard/obra/${id}/estrutura`),
}

// ─── Usuários ─────────────────────────────────────────────────
export const usuariosApi = {
  listar:           ()                          => get<any[]>('/usuarios'),
  criar:            (d: any)                    => post<any>('/usuarios', d),
  atualizar:        (id: string, d: any)        => put<any>(`/usuarios/${id}`, d),
  empreiteiros:     {
    listar:         ()                          => get<any[]>('/usuarios/empreiteiros'),
    criar:          (d: any)                    => post<any>('/usuarios/empreiteiros', d),
    atualizar:      (id: string, d: any)        => put<any>(`/usuarios/empreiteiros/${id}`, d),
  },
  colaboradores:    {
    listar:         (params?: object)           => get<any[]>('/usuarios/colaboradores', params),
    criar:          (d: any)                    => post<any>('/usuarios/colaboradores', d),
  },
}
