'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Plus, Loader2, X, Check, Pencil } from 'lucide-react'
import { clsx } from 'clsx'

interface Plano {
  id: string; nome: string; descricao?: string
  max_obras: number; max_usuarios: number; max_colaboradores: number
  preco_mensal: number; ativo: boolean
}

const EMPTY = { nome: '', descricao: '', max_obras: 5, max_usuarios: 10, max_colaboradores: 50, preco_mensal: 0, ativo: true }

export default function PlanosAdminPage() {
  const [rows, setRows]       = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState<typeof EMPTY>(EMPTY)
  const [editId, setEditId]   = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('planos').select('*').order('preco_mensal')
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() { setForm(EMPTY); setEditId(null); setModal(true); setMsg('') }
  function openEdit(r: Plano) {
    setForm({ nome: r.nome, descricao: r.descricao ?? '', max_obras: r.max_obras,
              max_usuarios: r.max_usuarios, max_colaboradores: r.max_colaboradores,
              preco_mensal: r.preco_mensal, ativo: r.ativo })
    setEditId(r.id); setModal(true); setMsg('')
  }

  async function save() {
    if (!form.nome.trim()) { setMsg('Nome é obrigatório'); return }
    setSaving(true)
    const payload = { ...form, nome: form.nome.trim(), descricao: form.descricao || null }
    if (editId) {
      await supabase.from('planos').update(payload).eq('id', editId)
    } else {
      await supabase.from('planos').insert(payload)
    }
    setSaving(false); setModal(false); load()
  }

  const fmt = (n: number) => n === -1 ? '∞' : n.toString()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
          <p className="text-gray-400 text-sm mt-0.5">Configure os planos de assinatura do SGO</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors">
          <Plus className="h-4 w-4" /> Novo Plano
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="h-7 w-7 animate-spin text-orange-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {rows.map(r => (
            <div key={r.id} className={clsx(
              'bg-white rounded-xl border p-5 relative',
              r.ativo ? 'border-gray-200 hover:border-orange-500' : 'border-gray-200 opacity-60'
            )}>
              <button onClick={() => openEdit(r)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                <Pencil className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center">
                  <Package className="h-4 w-4 text-gray-900" />
                </div>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full', r.ativo ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-100 text-gray-400')}>
                  {r.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900">{r.nome}</h3>
              {r.descricao && <p className="text-xs text-gray-400 mt-1 mb-3">{r.descricao}</p>}

              <p className="text-2xl font-bold text-orange-400 my-3">
                {r.preco_mensal === 0 ? 'Grátis' : `R$ ${r.preco_mensal.toLocaleString('pt-BR')}`}
                {r.preco_mensal > 0 && <span className="text-sm text-gray-400 font-normal">/mês</span>}
              </p>

              <div className="space-y-1.5 text-sm border-t border-gray-200 pt-3">
                {[
                  { label: 'Obras',         value: fmt(r.max_obras) },
                  { label: 'Usuários',      value: fmt(r.max_usuarios) },
                  { label: 'Colaboradores', value: fmt(r.max_colaboradores) },
                ].map(f => (
                  <div key={f.label} className="flex justify-between">
                    <span className="text-gray-400">{f.label}</span>
                    <span className="text-gray-900 font-medium">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-gray-900 font-semibold">{editId ? 'Editar Plano' : 'Novo Plano'}</h2>
              <button onClick={() => setModal(false)}><X className="h-5 w-5 text-gray-400 hover:text-gray-900" /></button>
            </div>
            <div className="p-5 space-y-4">
              {msg && <p className="text-red-400 text-sm">{msg}</p>}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Pro"
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descrição curta do plano"
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Preço Mensal (R$)</label>
                <input type="number" min={0} value={form.preco_mensal}
                  onChange={e => setForm(p => ({ ...p, preco_mensal: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Max Obras',   key: 'max_obras' },
                  { label: 'Max Usuários', key: 'max_usuarios' },
                  { label: 'Max Colab.',  key: 'max_colaboradores' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                    <input type="number" min={-1} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">Use -1 para ilimitado.</p>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo}
                  onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))}
                  className="rounded accent-orange-500" />
                <label htmlFor="ativo" className="text-sm text-gray-600">Plano ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-900">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg disabled:opacity-50">
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
