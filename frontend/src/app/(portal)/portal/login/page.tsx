'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { Building2, Lock, Mail, Loader2, HardHat } from 'lucide-react'

export default function PortalLoginPage() {
  const { loginPortal, portalUser, loadingPortal } = usePortalAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!loadingPortal && portalUser) {
      router.replace('/portal/home')
    }
  }, [loadingPortal, portalUser, router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await loginPortal(email, senha)
      router.replace('/portal/home')
    } catch (err: any) {
      setErro(err.message || 'E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 mb-4">
            <HardHat className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Portal do Empreiteiro</h1>
          <p className="text-slate-400 text-sm mt-1">SGO — Sistema de Gestão de Obras</p>
        </div>

        {/* Card login */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-5">Entrar</h2>

          {erro && (
            <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-3 py-2.5 text-sm text-red-300">
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="seu@email.com"
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Acesso exclusivo para empreiteiros cadastrados.
        </p>
      </div>
    </div>
  )
}
