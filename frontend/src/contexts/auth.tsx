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
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<UserWithPerfil | null>(null)
  const [token, setToken]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchPerfil(uid: string, accessToken: string): Promise<UserWithPerfil> {
    // Tenta buscar perfil na tabela usuarios
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', uid)
      .single()

    // Fallback: cria perfil básico se não encontrar
    const userData: UserWithPerfil = (data && data.id) ? data : {
      id: uid,
      nome: 'Usuário',
      email: '',
      ativo: true,
      perfil_sistema: 'user' as PerfilSistema,
      construtora_id: undefined,
    }

    // Verifica se é superadmin pela tabela master
    if (!userData.perfil_sistema || userData.perfil_sistema !== 'superadmin') {
      const { data: masterData } = await supabase
        .from('master')
        .select('id')
        .eq('id', uid)
        .maybeSingle()
      if (masterData) {
        userData.perfil_sistema = 'superadmin'
      } else {
        userData.perfil_sistema = 'user'
      }
    }

    setUser(userData)
    setToken(accessToken)
    try {
      localStorage.setItem('sgo_token', accessToken)
      localStorage.setItem('sgo_user', JSON.stringify(userData))
    } catch {}
    return userData
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchPerfil(session.user.id, session.access_token)
          .finally(() => setLoading(false))
      } else {
        // Try to restore from localStorage while waiting for session
        try {
          const cached = localStorage.getItem('sgo_user')
          const cachedToken = localStorage.getItem('sgo_token')
          if (cached && cachedToken) {
            setUser(JSON.parse(cached))
            setToken(cachedToken)
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
      const perfil = await fetchPerfil(data.session.user.id, data.session.access_token)
      return perfil
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
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
