'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi } from '@/lib/api'
import type { Usuario } from '@/types'

interface AuthContextData {
  user: Usuario | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<Usuario | null>(null)
  const [token, setToken]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('sgo_token')
    const storedUser  = localStorage.getItem('sgo_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    localStorage.setItem('sgo_token', res.access_token)
    localStorage.setItem('sgo_user', JSON.stringify(res.user))
    setToken(res.access_token)
    setUser(res.user)
  }

  const logout = () => {
    localStorage.removeItem('sgo_token')
    localStorage.removeItem('sgo_user')
    setUser(null)
    setToken(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
