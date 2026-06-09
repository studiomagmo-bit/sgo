'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Building2, Loader2, Lock, User, HardHat, Users, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [login_input, setLoginInput] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      let emailToUse = login_input.trim()

      // Se não parece email, trata como username e busca o email interno
      if (!emailToUse.includes('@')) {
        const { data: emailFound, error: rpcErr } = await supabase
          .rpc('buscar_email_por_username', { p_username: emailToUse })
        if (rpcErr || !emailFound) {
          toast.error('Usuário não encontrado. Verifique o nome de usuário.')
          setSubmitting(false)
          return
        }
        emailToUse = emailFound
      }

      const perfil = await login(emailToUse, password)
      if (perfil?.perfil_sistema === 'superadmin') {
        router.replace('/admin')
      } else {
        router.replace('/dashboard')
      }
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('Invalid login') || msg.includes('invalid credentials')) {
        toast.error('Usuário ou senha incorretos.')
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Conta pendente de confirmação. Fale com o administrador.')
      } else {
        toast.error(msg || 'Erro ao fazer login.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isUsername = login_input.length > 0 && !login_input.includes('@')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-white/3" />
      </div>

      <div className="relative w-full max-w-4xl flex rounded-3xl overflow-hidden shadow-2xl">

        {/* Painel esquerdo */}
        <div className="hidden md:flex flex-col justify-between w-1/2 bg-white/10 backdrop-blur-sm p-10 text-white">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold leading-none">SGO</p>
                <p className="text-xs text-blue-200">Sistema de Gestão de Obras</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-3 leading-snug">
              Gerencie suas obras com inteligência
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Controle de PCP, efetivo, empreiteiros, medições e muito mais — tudo em um lugar.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Users,     label: 'Gestor',      desc: 'Login com e-mail · Acessa todas as obras' },
              { icon: Building2, label: 'Engenheiro',  desc: 'Login com usuário · Gerencia sua obra' },
              { icon: HardHat,   label: 'Empreiteiro', desc: 'Portal próprio — /portal/login' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <r.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white leading-none">{r.label}</p>
                  <p className="text-xs text-blue-200 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito — form */}
        <div className="flex-1 bg-white p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8 md:hidden">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">SGO</p>
              <p className="text-xs text-gray-400">Sistema de Gestão de Obras</p>
            </div>
          </div>

          <div className="max-w-sm w-full mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h2>
            <p className="text-gray-400 text-sm mb-8">Use e-mail (gestor) ou nome de usuário (engenheiro)</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* E-mail ou Usuário */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {isUsername ? 'Nome de usuário' : 'E-mail ou usuário'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={login_input}
                    onChange={e => setLoginInput(e.target.value)}
                    required
                    disabled={submitting}
                    autoComplete="username"
                    placeholder="seu@email.com ou nome.usuario"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-60"
                  />
                  {isUsername && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5">
                      USERNAME
                    </span>
                  )}
                </div>
                {isUsername && (
                  <p className="text-xs text-blue-500 mt-1">🔑 Entrando como engenheiro/mestre (sem @)</p>
                )}
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-10 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-60"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white py-3 text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-all shadow-sm shadow-blue-200 mt-2"
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Entrando...</> : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Empreiteiro?{' '}
                <Link href="/portal/login" className="text-blue-600 hover:underline font-medium">
                  Acessar Portal do Empreiteiro →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
