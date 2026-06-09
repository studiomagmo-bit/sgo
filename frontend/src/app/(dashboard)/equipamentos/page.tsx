'use client'
import { useEffect, useState } from 'react'
import { equipamentos as equipamentosApi } from '@/lib/sgoApi'
import type { Equipamento } from '@/types'
import { Plus, Loader2, Truck, X } from 'lucide-react'
import { toast } from 'sonner'

const statusConfig: Record<string, { label: string; cls: string }> = {
  disponivel: { label: 'Disponível', cls: 'badge-verde'   },
  reservado:  { label: 'Reservado',  cls: 'badge-azul'    },
  em_uso:     { label: 'Em Uso',     cls: 'badge-amarelo' },
  manutencao: { label: 'Manutenção', cls: 'badge-vermelho'},
  inativo:    { label: 'Inativo',    cls: 'badge-cinza'   },
}

const FORM_INICIAL = {
  nome: '',
  descricao: '',
  modelo: '',
  fabricante: '',
  codigo_patrimonial: '',
  status: 'disponivel' as Equipamento['status'],
  origem: 'construtora' as Equipamento['origem'],
}

export default function EquipamentosPage() {
  const [equips, setEquips]     = useState<Equipamento[]>([])
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState(FORM_INICIAL)

  function carregarLista() {
    setLoading(true)
    equipamentosApi.listar().then(setEquips).finally(() => setLoading(false))
  }

  useEffect(() => {
    carregarLista()
  }, [])

  const filtrados = equips.filter(e => !filtro || e.status === filtro)

  function abrirModal() {
    setForm(FORM_INICIAL)
    setShowModal(true)
  }

  function fecharModal() {
    if (saving) return
    setShowModal(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        nome:   form.nome.trim(),
        status: form.status,
        origem: form.origem,
      }
      if (form.descricao.trim())          payload.descricao          = form.descricao.trim()
      if (form.modelo.trim())             payload.modelo             = form.modelo.trim()
      if (form.fabricante.trim())         payload.fabricante         = form.fabricante.trim()
      if (form.codigo_patrimonial.trim()) payload.codigo_patrimonial = form.codigo_patrimonial.trim()

      await equipamentosApi.criar(payload)
      toast.success('Equipamento cadastrado com sucesso!')
      setShowModal(false)
      carregarLista()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao cadastrar equipamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipamentos</h1>
          <p className="text-sm text-gray-500 mt-1">{equips.length} equipamento(s) cadastrado(s)</p>
        </div>
        <button
          onClick={abrirModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Equipamento
        </button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltro('')}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${!filtro ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
          Todos ({equips.length})
        </button>
        {Object.entries(statusConfig).map(([k, v]) => (
          <button key={k} onClick={() => setFiltro(filtro === k ? '' : k)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filtro === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
            {v.label} ({equips.filter(e => e.status === k).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum equipamento encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(e => {
            const s = statusConfig[e.status]
            return (
              <div key={e.id} className="rounded-xl border bg-white shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{e.nome}</p>
                      {e.modelo && <p className="text-xs text-gray-500">{e.fabricante} — {e.modelo}</p>}
                    </div>
                  </div>
                  <span className={s.cls}>{s.label}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Origem</span>
                    <span className="font-medium capitalize">{e.origem}</span>
                  </div>
                  {e.codigo_patrimonial && (
                    <div className="flex justify-between">
                      <span>Patrimônio</span>
                      <span className="font-medium">{e.codigo_patrimonial}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal Novo Equipamento ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">Novo Equipamento</h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  required
                  placeholder="Ex.: Betoneira 400L"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  name="descricao"
                  value={form.descricao}
                  onChange={handleChange}
                  placeholder="Descrição breve do equipamento"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Modelo e Fabricante lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    name="modelo"
                    value={form.modelo}
                    onChange={handleChange}
                    placeholder="Ex.: B400"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fabricante</label>
                  <input
                    type="text"
                    name="fabricante"
                    value={form.fabricante}
                    onChange={handleChange}
                    placeholder="Ex.: Menegotti"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Código Patrimonial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código Patrimonial</label>
                <input
                  type="text"
                  name="codigo_patrimonial"
                  value={form.codigo_patrimonial}
                  onChange={handleChange}
                  placeholder="Ex.: PAT-0042"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status e Origem lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="reservado">Reservado</option>
                    <option value="em_uso">Em Uso</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                  <select
                    name="origem"
                    value={form.origem}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="construtora">Construtora</option>
                    <option value="empreiteiro">Empreiteiro</option>
                  </select>
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2 transition-colors"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
