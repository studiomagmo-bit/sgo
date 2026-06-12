'use client'
import { useEffect, useState } from 'react'
import { empreiteiros as empreiteirosApi, portalApi } from '@/lib/sgoApi'
import type { Empreiteiro } from '@/types'
import {
  Plus, Loader2, HardHat, Phone, Mail, X,
  KeyRound, UserCheck, Lock, Eye, EyeOff, ExternalLink,
  CheckCircle2, AlertCircle, User, Building2, Copy, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

const FORM_INICIAL = {
  razao_social: '', nome_fantasia: '', cnpj: '',
  responsavel: '', telefone: '', email: '',
}

function portalUrl() {
  if (typeof window === 'undefined') return '/sgo/portal/login/'
  const base = window.location.pathname.startsWith('/sgo') ? '/sgo' : ''
  return window.location.origin + base + '/portal/login/'
}

export default function EmpreiteirosPage() {
  const [empreiteiros, setEmpreiteiros] = useState<Empreiteiro[]>([])
  const [acessos, setAcessos] = useState<Record<string, any[]>>({})
  const [loading, setLoading]   = useState(true)

  // Modal Novo Empreiteiro
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState(FORM_INICIAL)

  // Modal Criar Acesso — username + senha padrão 123
  const [showAcesso, setShowAcesso]     = useState(false)
  const [empAcesso, setEmpAcesso]       = useState<Empreiteiro | null>(null)
  const [username, setUsername]         = useState('')
  const [senhaCustom, setSenhaCustom]   = useState('')
  const [usarSenhaPadrao, setUsarSenhaPadrao] = useState(true)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [savingAcesso, setSavingAcesso] = useState(false)
  const [acessoCriado, setAcessoCriado] = useState<{ username: string; senha: string } | null>(null)
  const [copiado, setCopiado]           = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const lista = await empreiteirosApi.listar()
      setEmpreiteiros(lista)
      const entries = await Promise.all(
        lista.map(async (e: any) => {
          const acc = await portalApi.listarAcessos(e.id).catch(() => [])
          return [e.id, acc] as [string, any[]]
        })
      )
      setAcessos(Object.fromEntries(entries))
    } catch {}
    finally { setLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.razao_social.trim()) { toast.error('Razão social obrigatória.'); return }
    setSaving(true)
    try {
      const payload: Record<string, string> = { razao_social: form.razao_social.trim() }
      if (form.nome_fantasia.trim()) payload.nome_fantasia = form.nome_fantasia.trim()
      if (form.cnpj.trim())         payload.cnpj          = form.cnpj.trim()
      if (form.responsavel.trim())  payload.responsavel   = form.responsavel.trim()
      if (form.telefone.trim())     payload.telefone      = form.telefone.trim()
      if (form.email.trim())        payload.email         = form.email.trim()
      await empreiteirosApi.criar(payload)
      toast.success('Empreiteiro cadastrado!')
      setShowModal(false)
      await carregar()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao cadastrar.')
    } finally { setSaving(false) }
  }

  function abrirCriarAcesso(e: Empreiteiro) {
    setEmpAcesso(e)
    // Username padrão: nome fantasia ou razao social sem espaços, minúsculo
    const nome = (e.nome_fantasia || e.razao_social).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/, '')
    setUsername(nome)
    setSenhaCustom('')
    setUsarSenhaPadrao(true)
    setMostrarSenha(false)
    setAcessoCriado(null)
    setCopiado(false)
    setShowAcesso(true)
  }

  async function criarAcesso(ev: React.FormEvent) {
    ev.preventDefault()
    if (!empAcesso) return
    if (!username.trim()) { toast.error('Username obrigatório.'); return }

    const senhaFinal = usarSenhaPadrao ? '123456' : senhaCustom
    if (!usarSenhaPadrao && senhaFinal.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres.'); return
    }

    setSavingAcesso(true)
    try {
      const construtora_id = (empAcesso as any).construtora_id
      // Email interno gerado automaticamente a partir do username
      const emailInterno = username.trim().toLowerCase() + '@sgo-portal.app'
      await portalApi.criarAcesso({
        empreiteiro_id: empAcesso.id,
        construtora_id,
        nome:  empAcesso.responsavel || empAcesso.razao_social,
        email: emailInterno,
        senha: senhaFinal,
      })
      setAcessoCriado({ username: username.trim().toLowerCase(), senha: senhaFinal })
      toast.success('Acesso criado!')
      await carregar()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao criar acesso.')
    } finally { setSavingAcesso(false) }
  }

  function copiarCredenciais(u: string, s: string) {
    navigator.clipboard.writeText(`Usuário: ${u}\nSenha: ${s}\nPortal: ${portalUrl()}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
    toast.success('Credenciais copiadas!')
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400'

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empreiteiros</h1>
          <p className="text-sm text-gray-500 mt-1">{empreiteiros.length} empreiteiro(s) cadastrado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={portalUrl()} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
            <ExternalLink className="h-3.5 w-3.5" /> Abrir Portal do Empreiteiro
          </a>
          <button onClick={() => { setForm(FORM_INICIAL); setShowModal(true) }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> Novo Empreiteiro
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : empreiteiros.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <HardHat className="h-8 w-8 text-amber-500" />
          </div>
          <p className="text-gray-500 font-medium">Nenhum empreiteiro cadastrado.</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Novo Empreiteiro" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {empreiteiros.map(e => {
            const accs = acessos[e.id] ?? []
            const temAcesso = accs.length > 0
            return (
              <div key={e.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                {/* Card header */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-xl shrink-0">
                      {((e.nome_fantasia || e.razao_social) ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{e.nome_fantasia || e.razao_social}</p>
                      {e.nome_fantasia && <p className="text-xs text-gray-400 truncate">{e.razao_social}</p>}
                      {e.cnpj && <p className="text-xs text-gray-500 mt-0.5">{e.cnpj}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium border',
                        e.ativo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200')}>
                        {e.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {temAcesso && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 text-xs font-medium">
                          <UserCheck className="h-3 w-3" /> Portal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contato */}
                  <div className="mt-3 space-y-1">
                    {e.responsavel && (
                      <p className="flex items-center gap-1.5 text-sm text-gray-600">
                        <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />{e.responsavel}
                      </p>
                    )}
                    {e.telefone && (
                      <p className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />{e.telefone}
                      </p>
                    )}
                    {e.email && (
                      <p className="flex items-center gap-1.5 text-sm text-gray-500 truncate">
                        <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />{e.email}
                      </p>
                    )}
                  </div>

                  {/* Acessos existentes */}
                  {temAcesso && (
                    <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-xs text-gray-500 font-medium mb-1.5">Logins criados:</p>
                      <div className="space-y-1">
                        {accs.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <UserCheck className="h-3 w-3 text-teal-500 shrink-0" />
                            <span className="text-xs text-gray-700 font-mono">
                              {a.email?.replace('@sgo-portal.app', '') || a.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ação */}
                <div className="border-t border-gray-100">
                  {!temAcesso ? (
                    <button onClick={() => abrirCriarAcesso(e)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                      <KeyRound className="h-4 w-4" /> Criar acesso ao portal
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-400">
                      <UserCheck className="h-4 w-4 text-teal-500" />
                      <span className="text-teal-600 font-medium">Portal ativo</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal Novo Empreiteiro ──────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <HardHat className="h-5 w-5 text-amber-500" /> Novo Empreiteiro
              </h2>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {[
                { key: 'razao_social',  label: 'Razão Social *',  placeholder: 'Ex.: Construtora Silva Ltda', required: true },
                { key: 'nome_fantasia', label: 'Nome Fantasia',   placeholder: 'Ex.: Silva Construções' },
                { key: 'cnpj',          label: 'CNPJ',            placeholder: '00.000.000/0001-00' },
                { key: 'responsavel',   label: 'Responsável',     placeholder: 'Nome do responsável' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type="text" required={f.required}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className={inputCls} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'telefone', label: 'Telefone', placeholder: '(11) 99999-9999' },
                  { key: 'email',    label: 'E-mail',   placeholder: 'contato@empresa.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type="text" value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Criar Acesso (username + senha padrão) ────── */}
      {showAcesso && empAcesso && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-500" /> Criar Acesso ao Portal
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{empAcesso.nome_fantasia || empAcesso.razao_social}</p>
              </div>
              <button onClick={() => setShowAcesso(false)}><X className="h-5 w-5 text-gray-400 hover:text-gray-700" /></button>
            </div>

            {acessoCriado ? (
              /* Sucesso — mostra credenciais */
              <div className="p-6 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-teal-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Acesso criado!</h3>
                  <p className="text-sm text-gray-500 mt-1">Passe as credenciais ao empreiteiro:</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Usuário</span>
                    <span className="font-mono font-semibold text-gray-900">{acessoCriado.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Senha inicial</span>
                    <span className="font-mono font-semibold text-gray-900">{acessoCriado.senha}</span>
                  </div>
                  <div className="pt-1 border-t border-gray-200">
                    <span className="text-xs text-gray-500">Portal</span>
                    <p className="text-xs font-medium text-blue-600 break-all">{portalUrl()}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 text-left">
                  ⚠️ No primeiro login, o empreiteiro será solicitado a criar uma nova senha.
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => copiarCredenciais(acessoCriado.username, acessoCriado.senha)}
                    className={clsx('flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                      copiado ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')}>
                    {copiado ? <><Check className="h-4 w-4" />Copiado!</> : <><Copy className="h-4 w-4" />Copiar</>}
                  </button>
                  <button onClick={() => setShowAcesso(false)}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={criarAcesso} className="p-5 space-y-4">
                {/* Info */}
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700 flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>O empreiteiro faz login com <strong>usuário e senha</strong> — sem precisar de e-mail.</span>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome de usuário *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 text-sm select-none">@</span>
                    <input
                      type="text" required
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      placeholder="ex: magmo.construcoes"
                      className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Apenas letras minúsculas, números, ponto e traço</p>
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Senha inicial</label>

                  {/* Opção senha padrão 123456 */}
                  <label className="flex items-start gap-3 rounded-xl border cursor-pointer p-3 transition-all mb-2
                    border-blue-200 bg-blue-50">
                    <input type="radio" checked={usarSenhaPadrao} onChange={() => setUsarSenhaPadrao(true)}
                      className="mt-0.5 accent-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Senha padrão <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">123456</span></p>
                      <p className="text-xs text-blue-600 mt-0.5">Recomendado — o empreiteiro troca no primeiro acesso</p>
                    </div>
                  </label>

                  {/* Opção senha personalizada */}
                  <label className="flex items-start gap-3 rounded-xl border cursor-pointer p-3 transition-all
                    border-gray-200 hover:border-gray-300">
                    <input type="radio" checked={!usarSenhaPadrao} onChange={() => setUsarSenhaPadrao(false)}
                      className="mt-0.5 accent-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Definir senha agora</p>
                      {!usarSenhaPadrao && (
                        <div className="mt-2 relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            type={mostrarSenha ? 'text' : 'password'}
                            value={senhaCustom}
                            onChange={e => setSenhaCustom(e.target.value)}
                            minLength={6}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full rounded-lg border border-gray-200 pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button type="button" onClick={() => setMostrarSenha(v => !v)}
                            className="absolute right-3 top-2.5 text-gray-400">
                            {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div className="flex gap-2 pt-1 border-t">
                  <button type="button" onClick={() => setShowAcesso(false)}
                    className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-200">Cancelar</button>
                  <button type="submit" disabled={savingAcesso}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {savingAcesso ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Criar Acesso
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
