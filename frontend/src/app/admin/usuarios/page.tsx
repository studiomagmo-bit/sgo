'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Search, Loader2, X, Check, Mail, Copy } from 'lucide-react'
import { clsx } from 'clsx'

interface Construtora { id: string; nome: string }
interface Usuario {
  id: string; nome: string; email: string; perfil?: string
  perfil_sistema: string; ativo: boolean; criado_em: string
  construtoras?: { nome: string }
}
interface Convite {
  id: string; email: string; nome?: string; perfil: string; status: string
  criado_em: string; expira_em: string; token: string
  construtoras?: { nome: string }
}

const PERFIS = ['administrador','diretor','gerente','engenheiro','mestre','pcp','almoxarife']

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios]     = useState<Usuario[]>([])
  const [convites, setConvites]     = useState<Convite[]>([])
  const [construtoras, setCons]     = useState<Construtora[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'usuarios'|'convites'>('usuarios')
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(false)
  const [copied, setCopied]         = useState('')
  const [form, setForm]             = useState({ email: '', nome: '', perfil: 'engenheiro', construtora_id: '' })
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')

  async function load() {
    setLoading(true)
    const [u, c, cs] = await Promise.all([
      supabase.from('usuarios').select('*, construtoras(nome)').order('nome'),
      supabase.from('convites').select('*, construtoras(nome)').order('criado_em', { ascending: false }),
      supabase.from('construtoras').select('id,nome').eq('ativa', true).order('nome'),
    ])
    setUsuarios(u.data ?? [])
    setConvites(c.data ?? [])
    setCons(cs.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function enviarConvite() {
    if (!form.email.trim()) { setMsg('E-mail é obrigatório'); return }
    if (!form.construtora_id) { setMsg('Selecione uma construtora'); return }
    setSaving(true)
    const { error } = await supabase.from('convites').insert({
      email: form.email.trim().toLowerCase(),
      nome:  form.nome.trim() || null,
      perfil: form.perfil,
      construtora_id: form.construtora_id,
    })
    if (error) { setMsg(error.message); setSaving(false); return }
    setSaving(false)
    setModal(false)
    setForm({ email: '', nome: '', perfil: 'engenheiro', construtora_id: '' })
    load()
  }

  async function cancelarConvite(id: string) {
    await supabase.from('convites').update({ status: 'cancelado' }).eq('id', id)
    load()
  }

  async function toggleUsuario(id: string, ativo: boolean) {
    await supabase.from('usuarios').update({ ativo: !ativo }).eq('id', id)
    load()
  }

  async function setSuperadmin(id: string, current: string) {
    const novo = current === 'superadmin' ? 'user' : 'superadmin'
    await supabase.from('usuarios').update({ perfil_sistema: novo }).eq('id', id)
    load()
  }

  function copyLink(token: string) {
    const link = `${baseUrl}/invite?token=${token}`
    navigator.clipboard.writeText(link)
    setCopied(token)
    setTimeout(() => setCopied(''), 2000)
  }

  const filteredU = usuarios.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const filteredC = convites.filter(c =>
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie usuários e convites</p>
        </div>
        <button onClick={() => { setModal(true); setMsg('') }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors">
          <Plus className="h-4 w-4" /> Convidar Usuário
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-lg w-fit">
        {(['usuarios','convites'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}>
            {t === 'usuarios' ? `Usuários (${usuarios.length})` : `Convites (${convites.filter(c => c.status === 'pendente').length})`}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:border-purple-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="h-7 w-7 animate-spin text-purple-400" /></div>
      ) : tab === 'usuarios' ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Construtora</th>
                <th className="px-4 py-3 text-left">Perfil</th>
                <th className="px-4 py-3 text-center">Sistema</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredU.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nenhum usuário encontrado</td></tr>
              ) : filteredU.map(u => (
                <tr key={u.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.nome}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{u.construtoras?.nome ?? <span className="text-slate-500">—</span>}</td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-300 capitalize">{u.perfil}</span></td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs',
                      u.perfil_sistema === 'superadmin' ? 'bg-purple-900/60 text-purple-300' : 'bg-slate-700 text-slate-400')}>
                      {u.perfil_sistema}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs', u.ativo ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300')}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setSuperadmin(u.id, u.perfil_sistema)}
                        className="px-2 py-1 text-xs bg-purple-800/50 hover:bg-purple-700/70 text-purple-300 rounded transition-colors">
                        {u.perfil_sistema === 'superadmin' ? 'Remover admin' : 'Tornar admin'}
                      </button>
                      <button onClick={() => toggleUsuario(u.id, u.ativo)}
                        className={clsx('px-2 py-1 text-xs rounded transition-colors',
                          u.ativo ? 'bg-red-800/50 hover:bg-red-700/70 text-red-300' : 'bg-emerald-800/50 hover:bg-emerald-700/70 text-emerald-300')}>
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">E-mail</th>
                <th className="px-4 py-3 text-left">Construtora</th>
                <th className="px-4 py-3 text-left">Perfil</th>
                <th className="px-4 py-3 text-left">Expira em</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredC.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nenhum convite encontrado</td></tr>
              ) : filteredC.map(c => (
                <tr key={c.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-white">{c.email}</p>
                        {c.nome && <p className="text-xs text-slate-400">{c.nome}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{c.construtoras?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300 capitalize text-xs">{c.perfil}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(c.expira_em).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs', {
                      'bg-yellow-900/50 text-yellow-300': c.status === 'pendente',
                      'bg-emerald-900/50 text-emerald-300': c.status === 'aceito',
                      'bg-red-900/50 text-red-300': c.status === 'cancelado' || c.status === 'expirado',
                    })}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {c.status === 'pendente' && (
                        <>
                          <button onClick={() => copyLink(c.token)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">
                            {copied === c.token ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            {copied === c.token ? 'Copiado!' : 'Link'}
                          </button>
                          <button onClick={() => cancelarConvite(c.id)}
                            className="px-2 py-1 text-xs bg-red-800/50 hover:bg-red-700/70 text-red-300 rounded transition-colors">
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Convidar */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-white font-semibold">Convidar Usuário</h2>
              <button onClick={() => setModal(false)}><X className="h-5 w-5 text-slate-400 hover:text-white" /></button>
            </div>
            <div className="p-5 space-y-4">
              {msg && <p className="text-red-400 text-sm">{msg}</p>}
              <div>
                <label className="block text-xs text-slate-400 mb-1">E-mail *</label>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="usuario@empresa.com" type="email"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome (opcional)</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="João Silva"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Construtora *</label>
                <select value={form.construtora_id} onChange={e => setForm(p => ({ ...p, construtora_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                  <option value="">Selecione...</option>
                  {construtoras.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Perfil</label>
                <select value={form.perfil} onChange={e => setForm(p => ({ ...p, perfil: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                  {PERFIS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
              <p className="text-xs text-slate-500">Um link de convite será gerado. Compartilhe com o usuário para que ele crie sua senha.</p>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={enviarConvite} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Gerar Convite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
