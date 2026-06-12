'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { HardHat, Lock, Eye, EyeOff, Loader2, User } from 'lucide-react'
import { supabasePortal } from '@/lib/supabase'

export default function PortalLoginPage() {
  const { loginPortal, portalUser, loadingPortal } = usePortalAuth()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [senha, setSenha]       = useState('')
  const [mostrar, setMostrar]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState('')

  // Troca de senha no primeiro acesso
  const [trocaSenha, setTrocaSenha]     = useState(false)
  const [novaSenha, setNovaSenha]       = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [mostrarNova, setMostrarNova]   = useState(false)
  const [salvando, setSalvando]         = useState(false)
  const [erroTroca, setErroTroca]       = useState('')

  useEffect(() => {
    if (!loadingPortal && portalUser) {
      router.replace('/portal/home')
    }
  }, [loadingPortal, portalUser, router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!username.trim()) { setErro('Informe o nome de usuário.'); return }
    setLoading(true)
    try {
      // Monta o email interno: username@portal.sgo.local
      const emailInterno = username.trim().toLowerCase() + '@portal.sgo.local'
      await loginPortal(emailInterno, senha)

      // Verifica se a senha é a padrão (123456) — força troca
      if (senha === '123456') {
        setTrocaSenha(true)
        setLoading(false)
        return
      }
      router.replace('/portal/home')
    } catch {
      setErro('Usuário ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTrocarSenha(e: React.FormEvent) {
    e.preventDefault()
    setErroTroca('')
    if (novaSenha.length < 6) { setErroTroca('Senha deve ter no mínimo 6 caracteres.'); return }
    if (novaSenha !== confirmaSenha) { setErroTroca('Senhas não coincidem.'); return }
    if (novaSenha === '123456') { setErroTroca('Escolha uma senha diferente da padrão.'); return }
    setSalvando(true)
    try {
      const { error } = await supabasePortal.auth.updateUser({ password: novaSenha })
      if (error) throw error
      router.replace('/portal/home')
    } catch (err: any) {
      setErroTroca(err?.message ?? 'Erro ao atualizar senha.')
    } finally {
      setSalvando(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors'

  if (loadingPortal) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 mb-4">
            <HardHat className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portal do Empreiteiro</h1>
          <p className="text-gray-500 text-sm mt-1">SGO — Sistema de Gestão de Obras</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-xl shadow-gray-100">

          {!trocaSenha ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Entrar</h2>

              {erro && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Nome de usuário
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="seu.usuario"
                      required
                      autoComplete="username"
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type={mostrar ? 'text' : 'password'}
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="••••••"
                      required
                      autoComplete="current-password"
                      className={`${inputCls} pl-10 pr-10`}
                    />
                    <button type="button" onClick={() => setMostrar(v => !v)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600">
                      {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm shadow-blue-200 mt-2">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Troca de senha no primeiro acesso */}
              <div className="text-center mb-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 border border-amber-200 mb-3">
                  <Lock className="h-6 w-6 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Crie sua senha</h2>
                <p className="text-sm text-gray-500 mt-1">
                  É o seu primeiro acesso. Defina uma senha pessoal para continuar.
                </p>
              </div>

              {erroTroca && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {erroTroca}
                </div>
              )}

              <form onSubmit={handleTrocarSenha} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Nova senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type={mostrarNova ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required minLength={6}
                      className={`${inputCls} pl-10 pr-10`}
                    />
                    <button type="button" onClick={() => setMostrarNova(v => !v)}
                      className="absolute right-3.5 top-3.5 text-gray-400">
                      {mostrarNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type={mostrarNova ? 'text' : 'password'}
                      value={confirmaSenha}
                      onChange={e => setConfirmaSenha(e.target.value)}
                      placeholder="Repita a senha"
                      required
                      className={`${inputCls} pl-10 ${confirmaSenha && novaSenha !== confirmaSenha ? 'border-red-300 focus:ring-red-400' : ''}`}
                    />
                  </div>
                  {confirmaSenha && novaSenha !== confirmaSenha && (
                    <p className="text-xs text-red-500 mt-1">Senhas não coincidem</p>
                  )}
                </div>

                {/* Força da senha */}
                {novaSenha && (
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                        novaSenha.length >= i * 3
                          ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-blue-400' : 'bg-emerald-500'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                )}

                <button type="submit" disabled={salvando || novaSenha !== confirmaSenha}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors mt-2">
                  {salvando ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : 'Definir senha e entrar'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          SGO · Sistema de Gestão Operacional de Obras
        </p>
      </div>
    </div>
  )
}
