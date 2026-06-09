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
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<UserWithPerfil | null>(null)
  const [token, setToken]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchPerfil(uid: string, accessToken: string) {
    try {
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', uid)
        .single()

      // Se encontrou perfil, usa ele; caso contrário cria perfil básico
      const userData: UserWithPerfil = data ?? {
        id: uid,
        nome: 'Usuário',
        email: '',
        ativo: true,
        perfil_sistema: 'user',
        construtora_id: undefined,
      }

      setUser(userData)
      setToken(accessToken)
      localStorage.setItem('sgo_token', accessToken)
      localStorage.setItem('sgo_user', JSON.stringify(userData))
    } catch {
      // Mesmo com erro, cria sessão básica para não bloquear login
      const userData: UserWithPerfil = {
        id: uid, nome: 'Usuário', email: '',
        ativo: true, perfil_sistema: 'user', construtora_id: undefined,
      }
      setUser(userData)
      setToken(accessToken)
    }
  }

  useEffect(() => {
    // Verifica sessão existente ao carregar a página
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchPerfil(session.user.id, session.access_token)
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Escuta mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await fetchPerfil(session.user.id, session.access_token)
        } else {
          setUser(null)
          setToken(null)
          localStorage.removeItem('sgo_token')
          localStorage.removeItem('sgo_user')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    if (data.session) {
      await fetchPerfil(data.session.user.id, data.session.access_token)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setToken(null)
    localStorage.removeItem('sgo_token')
    localStorage.removeItem('sgo_user')
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
