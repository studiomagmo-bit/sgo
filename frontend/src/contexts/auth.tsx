'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Usuario } from '@/types'

export type PerfilSistema = 'superadmin' | 'user'
export type UserWithPerfil = Usuario & { perfil_sistema?: PerfilSistema }

interface AuthContextData {
  user: UserWithPerfil | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<UserWithPerfil | null>
  logout: () => void
  refreshPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

function loginUrl() {
  if (typeof window === 'undefined') return '/login'
  const base = window.location.pathname.startsWith('/sgo') ? '/sgo' : ''
  return base + '/login/'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<UserWithPerfil | null>(null)
  const [token, setToken]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchPerfil(uid: string, accessToken: string): Promise<UserWithPerfil> {
    // Sempre busca do banco — nunca confia no cache para o perfil
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', uid)
      .single()

    if (error) console.warn('fetchPerfil error:', error.message)

    const userData: UserWithPerfil = (data && data.id) ? { ...data } : {
      id: uid,
      nome: 'Usuário',
      email: '',
      ativo: true,
      perfil_sistema: 'user' as PerfilSistema,
      construtora_id: undefined,
    }

    // Detecta superadmin via tabela master
    const { data: masterData } = await supabase
      .from('master')
      .select('id')
      .eq('id', uid)
      .maybeSingle()
    userData.perfil_sistema = masterData ? 'superadmin' : 'user'

    setUser(userData)
    setToken(accessToken)

    // Salva no cache MAS com versão — para invalidar caches antigos
    try {
      const cache = { ...userData, _v: 2, _ts: Date.now() }
      localStorage.setItem('sgo_user', JSON.stringify(cache))
      localStorage.setItem('sgo_token', accessToken)
    } catch {}

    return userData
  }

  async function refreshPerfil() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await fetchPerfil(session.user.id, session.access_token)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Sempre busca do banco na inicialização — ignora cache de perfil
        fetchPerfil(session.user.id, session.access_token)
      } else {
        // Sem sessão — tenta cache apenas para mostrar algo enquanto carrega
        try {
          const cached = localStorage.getItem('sgo_user')
          const cachedToken = localStorage.getItem('sgo_token')
          const parsed = cached ? JSON.parse(cached) : null
          // Só usa cache se tiver versão 2 (nova) — descarta caches antigos
          if (parsed?._v === 2 && cachedToken) {
            setUser(parsed)
            setToken(cachedToken)
          } else {
            // Limpa cache antigo
            localStorage.removeItem('sgo_user')
            localStorage.removeItem('sgo_token')
          }
        } catch {}
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await fetchPerfil(session.user.id, session.access_token)
        } else {
          setUser(null)
          setToken(null)
          try {
            localStorage.removeItem('sgo_token')
            localStorage.removeItem('sgo_user')
          } catch {}
        }
      }
    )
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string): Promise<UserWithPerfil | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    if (data.session) {
      return await fetchPerfil(data.session.user.id, data.session.access_token)
    }
    return null
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setToken(null)
    try {
      localStorage.removeItem('sgo_token')
      localStorage.removeItem('sgo_user')
    } catch {}
    window.location.replace(loginUrl())
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
