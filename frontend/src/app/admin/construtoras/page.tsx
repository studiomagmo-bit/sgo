'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Plus, Search, Power, Loader2, X, Check } from 'lucide-react'
import { clsx } from 'clsx'

interface Plano { id: string; nome: string }
interface Construtora {
  id: string; nome: string; cnpj?: string; email?: string; telefone?: string
  ativa: boolean; plano_id?: string; trial_ate?: string; criado_em?: string
  planos?: { nome: string }
}

const EMPTY = { nome: '', cnpj: '', email: '', telefone: '', plano_id: '', trial_ate: '', observacoes: '' }

export default function ConstructorasAdminPage() {
  const [rows, setRows]       = useState<Construtora[]>([])
  const [planos, setPlanos]   = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [msg, setMsg]         = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('construtoras')
      .select('*, planos(nome)')
      .order('nome')
    setRows(data ?? [])
    const { data: pl } = await supabase.from('planos').select('id,nome').eq('ativo', true).order('preco_mensal')
    setPlanos(pl ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r =>
    r.nome.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  )

  function openNew() { setForm(EMPTY); setEditId(null); setModal(true); setMsg('') }
  function openEdit(r: Construtora) {
    setForm({ nome: r.nome, cnpj: r.cnpj ?? '', email: r.email ?? '', telefone: r.telefone ?? '',
              plano_id: r.plano_id ?? '', trial_ate: r.trial_ate ?? '', observacoes: '' })
    setEditId(r.id); setModal(true); setMsg('')
  }

  async function save() {
    if (!form.nome.trim()) { setMsg('Nome é obrigatório'); return }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(), cnpj: form.cnpj || null, email: form.email || null,
      telefone: form.telefone || null, plano_id: form.plano_id || null,
      trial_ate: form.trial_ate || null,
    }
    if (editId) {
      await supabase.from('construtoras').update(payload).eq('id', editId)
    } else {
      await supabase.from('construtoras').insert({ ...payload, ativa: true })
    }
    setSaving(false); setModal(false); load()
  }

  async function toggle(id: string, ativa: boolean) {
    await supabase.from('construtoras').update({ ativa: !ativa }).eq('id', id)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Construtoras</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gerencie todas as construtoras do SGO</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
          <Plus className="h-4 w-4" /> Nova Construtora
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500" />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="h-7 w-7 animate-spin text-blue-400" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Construtora</th>
                <th className="px-4 py-3 text-left">Contato</th>
                <th className="px-4 py-3 text-left">Plano</th>
                <th className="px-4 py-3 text-left">Trial até</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Nenhuma construtora encontrada</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                        {r.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{r.nome}</p>
                        {r.cnpj && <p className="text-xs text-gray-400">{r.cnpj}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.email || <span className="text-gray-500">—</span>}</td>
                  <td className="px-4 py-3">
                    {r.planos ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 text-xs">{r.planos.nome}</span>
                    ) : <span className="text-gray-500 text-xs">Sem plano</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.trial_ate ? new Date(r.trial_ate).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', r.ativa ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300')}>
                      {r.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(r)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors">Editar</button>
                      <button onClick={() => toggle(r.id, r.ativa)}
                        className={clsx('p-1.5 rounded-lg transition-colors', r.ativa ? 'text-red-400 hover:bg-red-900/30' : 'text-emerald-400 hover:bg-emerald-900/30')}>
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nova/Editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-gray-900 font-semibold">{editId ? 'Editar Construtora' : 'Nova Construtora'}</h2>
              <button onClick={() => setModal(false)}><X className="h-5 w-5 text-gray-400 hover:text-gray-900" /></button>
            </div>
            <div className="p-5 space-y-4">
              {msg && <p className="text-red-400 text-sm">{msg}</p>}
              {[
                { label: 'Nome *', key: 'nome', placeholder: 'Ex: Construtora XYZ' },
                { label: 'CNPJ',   key: 'cnpj', placeholder: '00.000.000/0001-00' },
                { label: 'E-mail', key: 'email', placeholder: 'contato@construtora.com' },
                { label: 'Telefone', key: 'telefone', placeholder: '(11) 99999-9999' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Plano</label>
                  <select value={form.plano_id} onChange={e => setForm(p => ({ ...p, plano_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Sem plano</option>
                    {planos.map(pl => <option key={pl.id} value={pl.id}>{pl.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Trial até</label>
                  <input type="date" value={form.trial_ate} onChange={e => setForm(p => ({ ...p, trial_ate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-900 transition-colors">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
