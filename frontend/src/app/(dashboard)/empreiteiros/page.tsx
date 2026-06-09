'use client'
import { useEffect, useState } from 'react'
import { empreiteiros as empreiteirosApi, portalApi } from '@/lib/sgoApi'
import type { Empreiteiro } from '@/types'
import {
  Plus, Loader2, HardHat, Phone, Mail, X,
  KeyRound, UserCheck, Lock, Eye, EyeOff, ExternalLink,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

const FORM_INICIAL = {
  razao_social: '', nome_fantasia: '', cnpj: '',
  responsavel: '', telefone: '', email: '',
}

export default function EmpreiteirosPage() {
  const [empreiteiros, setEmpreiteiros] = useState<Empreiteiro[]>([])
  const [acessos, setAcessos] = useState<Record<string, any[]>>({})
  const [loading, setLoading]   = useState(true)

  // Modal Novo Empreiteiro
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState(FORM_INICIAL)

  // Modal Criar Acesso
  const [showAcesso, setShowAcesso]       = useState(false)
  const [empAcesso, setEmpAcesso]         = useState<Empreiteiro | null>(null)
  const [acessoForm, setAcessoForm]       = useState({ nome: '', email: '', senha: '', confirma: '' })
  const [savingAcesso, setSavingAcesso]   = useState(false)
  const [mostrarSenha, setMostrarSenha]   = useState(false)
  const [acessoCriado, setAcessoCriado]   = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const lista = await empreiteirosApi.listar()
      setEmpreiteiros(lista)
      // Carrega acessos de cada empreiteiro em paralelo
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
    } finally {
      setSaving(false)
    }
  }

  function abrirCriarAcesso(e: Empreiteiro) {
    setEmpAcesso(e)
    setAcessoForm({
      nome:     e.responsavel ?? e.razao_social,
      email:    e.email ?? '',
      senha:    '',
      confirma: '',
    })
    setAcessoCriado(false)
    setMostrarSenha(false)
    setShowAcesso(true)
  }

  async function criarAcesso(ev: React.FormEvent) {
    ev.preventDefault()
    if (!empAcesso) return
    if (acessoForm.senha.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres.'); return }
    if (acessoForm.senha !== acessoForm.confirma) { toast.error('Senhas não coincidem.'); return }
    if (!acessoForm.email.trim()) { toast.error('E-mail obrigatório.'); return }

    setSavingAcesso(true)
    try {
      // Precisa construtora_id — pega do empreiteiro
      const construtora_id = (empAcesso as any).construtora_id
      await portalApi.criarAcesso({
        empreiteiro_id: empAcesso.id,
        construtora_id,
        nome:  acessoForm.nome.trim(),
        email: acessoForm.email.trim(),
        senha: acessoForm.senha,
      })
      setAcessoCriado(true)
      toast.success('Acesso criado! O empreiteiro já pode entrar no portal.')
      await carregar()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao criar acesso.')
    } finally {
      setSavingAcesso(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Empreiteiros</h1>
          <p className="text-sm text-slate-400 mt-1">{empreiteiros.length} empreiteiro(s) cadastrado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/portal/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-blue-700/40 bg-blue-900/20 px-3 py-2 text-xs text-blue-300 hover:bg-blue-900/40 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Portal do Empreiteiro
          </a>
          <button
            onClick={() => { setForm(FORM_INICIAL); setShowModal(true) }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Novo Empreiteiro
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : empreiteiros.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-12 text-center">
          <HardHat className="h-12 w-12 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">Nenhum empreiteiro cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {empreiteiros.map(e => {
            const accs = acessos[e.id] ?? []
            const temAcesso = accs.length > 0
            return (
              <div key={e.id} className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 hover:bg-slate-800 transition-colors">
                {/* Cabeçalho do card */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-11 w-11 rounded-xl bg-blue-900/50 border border-blue-700/40 flex items-center justify-center text-blue-300 font-bold text-lg shrink-0">
                    {((e.nome_fantasia || e.razao_social) ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{e.nome_fantasia || e.razao_social}</p>
                    {e.nome_fantasia && <p className="text-xs text-slate-500 truncate">{e.razao_social}</p>}
                    {e.cnpj && <p className="text-xs text-slate-600 mt-0.5">CNPJ: {e.cnpj}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border', e.ativo ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' : 'bg-slate-700 text-slate-400 border-slate-600')}>
                      {e.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {temAcesso && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/40 px-2 py-0.5 text-xs">
                        <UserCheck className="h-3 w-3" /> Portal
                      </span>
                    )}
                  </div>
                </div>

                {/* Dados de contato */}
                <div className="space-y-1 text-sm mb-4">
                  {e.responsavel && <p className="font-medium text-slate-300">Resp.: {e.responsavel}</p>}
                  {e.telefone && (
                    <p className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />{e.telefone}
                    </p>
                  )}
                  {e.email && (
                    <p className="flex items-center gap-1.5 text-slate-400 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />{e.email}
                    </p>
                  )}
                </div>

                {/* Acessos existentes */}
                {temAcesso && (
                  <div className="mb-3 rounded-lg bg-blue-900/20 border border-blue-800/40 px-3 py-2">
                    <p className="text-xs text-slate-400 mb-1 font-medium">Logins do portal:</p>
                    {accs.map((a: any) => (
                      <p key={a.id} className="text-xs text-blue-300 truncate flex items-center gap-1.5">
                        <UserCheck className="h-3 w-3 shrink-0" />{a.email}
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 capitalize">{a.perfil}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Ação: Criar Acesso */}
                <button
                  onClick={() => abrirCriarAcesso(e)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-600/40 bg-blue-600/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-600/20 transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {temAcesso ? 'Criar outro acesso' : 'Criar acesso ao portal'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Modal Novo Empreiteiro ──────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Novo Empreiteiro</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {[
                { name: 'razao_social',  label: 'Razão Social *',    placeholder: 'Ex.: Construtora Silva Ltda', required: true },
                { name: 'nome_fantasia', label: 'Nome Fantasia',      placeholder: 'Ex.: Silva Construções' },
                { name: 'cnpj',          label: 'CNPJ',               placeholder: '00.000.000/0001-00' },
                { name: 'responsavel',   label: 'Responsável',        placeholder: 'Nome do responsável' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                  <input
                    type="text" name={f.name} required={f.required}
                    value={(form as any)[f.name]}
                    onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'telefone', label: 'Telefone', placeholder: '(11) 99999-9999', type: 'text' },
                  { name: 'email',    label: 'E-mail',   placeholder: 'contato@empresa.com', type: 'email' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                    <input
                      type={f.type} name={f.name}
                      value={(form as any)[f.name]}
                      onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Criar Acesso ──────────────────────────────────── */}
      {showAcesso && empAcesso && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div>
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-400" /> Criar Acesso ao Portal
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{empAcesso.nome_fantasia || empAcesso.razao_social}</p>
              </div>
              <button onClick={() => setShowAcesso(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            {acessoCriado ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-semibold text-white text-lg mb-2">Acesso criado!</h3>
                <p className="text-slate-400 text-sm mb-1">E-mail: <strong className="text-white">{acessoForm.email}</strong></p>
                <p className="text-slate-400 text-sm mb-5">O empreiteiro já pode entrar em <strong className="text-blue-400">/portal/login</strong></p>
                <button onClick={() => setShowAcesso(false)} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">Fechar</button>
              </div>
            ) : (
              <form onSubmit={criarAcesso} className="px-5 py-4 space-y-4">
                <div className="rounded-lg bg-blue-900/20 border border-blue-800/40 px-3 py-2.5 text-xs text-blue-300 flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>O empreiteiro acessará o portal em <strong>/portal/login</strong> com o e-mail e senha definidos aqui.</span>
                </div>

                {/* Nome */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nome do responsável *</label>
                  <input type="text" value={acessoForm.nome} required onChange={e => setAcessoForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">E-mail de acesso *</label>
                  <input type="email" value={acessoForm.email} required onChange={e => setAcessoForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Senha *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={acessoForm.senha}
                      required minLength={6}
                      onChange={e => setAcessoForm(f => ({ ...f, senha: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-lg bg-slate-700 border border-slate-600 pl-9 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button type="button" onClick={() => setMostrarSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirma senha */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Confirmar senha *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={acessoForm.confirma}
                      required
                      onChange={e => setAcessoForm(f => ({ ...f, confirma: e.target.value }))}
                      placeholder="Repita a senha"
                      className={clsx('w-full rounded-lg bg-slate-700 border pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none', acessoForm.confirma && acessoForm.senha !== acessoForm.confirma ? 'border-red-500' : 'border-slate-600 focus:border-blue-500')}
                    />
                  </div>
                  {acessoForm.confirma && acessoForm.senha !== acessoForm.confirma && (
                    <p className="text-xs text-red-400 mt-1">Senhas não coincidem</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-700">
                  <button type="button" onClick={() => setShowAcesso(false)} className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600">Cancelar</button>
                  <button type="submit" disabled={savingAcesso} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                    {savingAcesso ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : <><KeyRound className="h-4 w-4" />Criar Acesso</>}
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
