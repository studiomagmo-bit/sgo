'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Building2, Loader2, Check, Eye, EyeOff } from 'lucide-react'

interface Convite {
  id: string; email: string; nome?: string; perfil: string
  construtora_id: string; construtoras?: { nome: string }
}

export default function InvitePage() {
  const router = useRouter()
  const [token, setToken]       = useState('')
  const [convite, setConvite]   = useState<Convite | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm]         = useState({ nome: '', password: '', confirm: '' })
  const [showPw, setShowPw]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [done, setDone]         = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') ?? ''
    setToken(t)
    if (!t) { setNotFound(true); setLoading(false); return }

    supabase
      .from('convites')
      .select('*, construtoras(nome)')
      .eq('token', t)
      .eq('status', 'pendente')
      .gt('expira_em', new Date().toISOString())
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true) }
        else { setConvite(data); setForm(f => ({ ...f, nome: data.nome ?? '' })) }
        setLoading(false)
      })
  }, [])

  async function aceitar() {
    if (!convite) return
    if (!form.nome.trim())            { setMsg('Informe seu nome');           return }
    if (form.password.length < 6)     { setMsg('Senha mínima de 6 caracteres'); return }
    if (form.password !== form.confirm){ setMsg('As senhas não coincidem');   return }

    setSaving(true); setMsg('')
    try {
      // 1. Criar conta Supabase Auth
      const { data: auth, error: authErr } = await supabase.auth.signUp({
        email: convite.email,
        password: form.password,
      })
      if (authErr) throw new Error(authErr.message)
      const uid = auth.user?.id
      if (!uid) throw new Error('Não foi possível criar o usuário')

      // 2. Inserir em usuarios (perfil vinculado à construtora)
      await supabase.from('usuarios').insert({
        id:             uid,
        nome:           form.nome.trim(),
        email:          convite.email,
        perfil:         convite.perfil,
        construtora_id: convite.construtora_id,
        ativo:          true,
      })

      // 3. Marcar convite como aceito
      await supabase.from('convites').update({ status: 'aceito', aceito_em: new Date().toISOString() }).eq('id', convite.id)

      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (e: any) {
      setMsg(e.message ?? 'Erro ao criar conta')
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm w-full">
        <div className="text-4xl mb-4">❌</div>
        <h1 className="text-gray-900 font-bold text-lg mb-2">Convite inválido</h1>
        <p className="text-gray-400 text-sm">Este convite não existe, já foi utilizado ou expirou.</p>
        <button onClick={() => router.push('/login')}
          className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
          Ir para o Login
        </button>
      </div>
    </div>
  )

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm w-full">
        <div className="h-16 w-16 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-gray-900" />
        </div>
        <h1 className="text-gray-900 font-bold text-lg mb-2">Conta criada! 🎉</h1>
        <p className="text-gray-400 text-sm">Bem-vindo ao SGO. Redirecionando para o login...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-center">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-6 w-6 text-gray-900" />
          </div>
          <h1 className="text-gray-900 font-bold text-xl">Bem-vindo ao SGO</h1>
          <p className="text-blue-200 text-sm mt-1">
            Você foi convidado para <span className="font-semibold">{convite?.construtoras?.nome}</span>
          </p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-100 rounded-lg p-3 text-sm">
            <p className="text-gray-400">E-mail: <span className="text-gray-900">{convite?.email}</span></p>
            <p className="text-gray-400">Perfil: <span className="text-gray-900 capitalize">{convite?.perfil}</span></p>
          </div>

          {msg && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">{msg}</div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Seu nome completo *</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="João da Silva"
              className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Criar senha *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 pr-10 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500" />
              <button onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Confirmar senha *</label>
            <input type="password" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repita a senha"
              className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500" />
          </div>

          <button onClick={aceitar} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 mt-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'Criando conta...' : 'Criar minha conta'}
          </button>
        </div>
      </div>
    </div>
  )
}
