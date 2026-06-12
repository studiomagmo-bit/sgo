'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { portalApi } from '@/lib/sgoApi'

const STORAGE_KEY = 'sgo_portal_user'

type PortalUser = {
  id: string
  nome: string
  email: string
  perfil: string
  empreiteiro_id: string
  construtora_id: string
  empreiteiros?: { id: string; razao_social: string; nome_fantasia?: string; construtora_id: string }
}

type PortalAuthCtx = {
  portalUser: PortalUser | null
  loadingPortal: boolean
  loginPortal: (email: string, senha: string) => Promise<void>
  logoutPortal: () => void
}

const PortalAuthContext = createContext<PortalAuthCtx>({
  portalUser: null,
  loadingPortal: true,
  loginPortal: async () => {},
  logoutPortal: () => {},
})

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null)
  const [loadingPortal, setLoadingPortal] = useState(true)

  useEffect(() => {
    // Tenta recuperar sessão do localStorage
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        setPortalUser(JSON.parse(cached))
      }
    } catch {}
    // Verifica sessão ativa no Supabase
    portalApi.buscarPerfil().then(perfil => {
      if (perfil) {
        const user: PortalUser = {
          id: perfil.id,
          nome: perfil.nome,
          email: perfil.email,
          perfil: perfil.perfil,
          empreiteiro_id: perfil.empreiteiro_id,
          construtora_id: perfil.construtora_id,
          empreiteiros: perfil.empreiteiros,
        }
        setPortalUser(user)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      } else {
        setPortalUser(null)
        localStorage.removeItem(STORAGE_KEY)
      }
    }).catch(() => {
      setPortalUser(null)
      setLoadingPortal(false)
    })
    setLoadingPortal(false)
  }, [])

  const loginPortal = async (email: string, senha: string) => {
    await portalApi.loginPortal(email, senha)
    const perfil = await portalApi.buscarPerfil()
    if (!perfil) throw new Error('Acesso não autorizado. Conta não vinculada a nenhum empreiteiro.')
    const user: PortalUser = {
      id: perfil.id,
      nome: perfil.nome,
      email: perfil.email,
      perfil: perfil.perfil,
      empreiteiro_id: perfil.empreiteiro_id,
      construtora_id: perfil.construtora_id,
      empreiteiros: perfil.empreiteiros,
    }
    setPortalUser(user)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }

  const logoutPortal = () => {
    portalApi.logoutPortal()
    setPortalUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <PortalAuthContext.Provider value={{ portalUser, loadingPortal, loginPortal, logoutPortal }}>
      {children}
    </PortalAuthContext.Provider>
  )
}

export const usePortalAuth = () => useContext(PortalAuthContext)
