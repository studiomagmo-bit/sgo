'use client'
import { useEffect, useState } from 'react'
import { medicoes as medicoesApi, obras as obrasApi, empreiteiros as empreiteirosApi } from '@/lib/sgoApi'
import type { Medicao, Obra, Empreiteiro, StatusMedicao } from '@/types'
import { Plus, Loader2, DollarSign, X } from 'lucide-react'
import { toast } from 'sonner'

const statusConfig: Record<string, { label: string; cls: string }> = {
  aberta:   { label: 'Aberta',   cls: 'badge-azul'    },
  fechada:  { label: 'Fechada',  cls: 'badge-amarelo' },
  aprovada: { label: 'Aprovada', cls: 'badge-verde'   },
  paga:     { label: 'Paga',     cls: 'badge-cinza'   },
}

const fmt = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'

interface FormData {
  obra_id: string
  empreiteiro_id: string
  periodo_inicio: string
  periodo_fim: string
  numero: string
  valor_bruto: string
  valor_desconto: string
  status: StatusMedicao
}

const formInicial: FormData = {
  obra_id: '',
  empreiteiro_id: '',
  periodo_inicio: '',
  periodo_fim: '',
  numero: '',
  valor_bruto: '',
  valor_desconto: '0',
  status: 'aberta',
}

export default function MedicoesPage() {
  const [obras, setObras]               = useState<Obra[]>([])
  const [obraId, setObraId]             = useState('')
  const [medicoes, setMedicoes]         = useState<Medicao[]>([])
  const [loading, setLoading]           = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  // Modal
  const [showModal, setShowModal]       = useState(false)
  const [empreiteiros, setEmpreiteiros] = useState<Empreiteiro[]>([])
  const [form, setForm]                 = useState<FormData>(formInicial)
  const [saving, setSaving]             = useState(false)

  // Carregar obras e empreiteiros ao montar
  useEffect(() => {
    obrasApi.listar().then(obs => {
      setObras(obs)
      try {
        const u = JSON.parse(localStorage.getItem('sgo_user') ?? '{}')
        if (['engenheiro','mestre','pcp','almoxarife'].includes(u?.perfil) && obs.length === 1) {
          setObraId(obs[0].id)
        }
      } catch {}
    })
    empreiteirosApi.listar().then(setEmpreiteiros)
  }, [])

  // Carregar medições ao trocar obra/filtro
  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    medicoesApi.listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(setMedicoes).finally(() => setLoading(false))
  }, [obraId, filtroStatus])

  const recarregar = () => {
    if (!obraId) return
    setLoading(true)
    medicoesApi.listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(setMedicoes).finally(() => setLoading(false))
  }

  const totalBruto = medicoes.reduce((s, m) => s + Number(m.valor_bruto),  0)
  const totalLiq   = medicoes.reduce((s, m) => s + Number(m.valor_liquido), 0)

  // Valor líquido calculado
  const valorBruto    = parseFloat(form.valor_bruto)    || 0
  const valorDesconto = parseFloat(form.valor_desconto) || 0
  const valorLiquido  = valorBruto - valorDesconto

  const abrirModal = () => {
    setForm({ ...formInicial, obra_id: obraId })
    setShowModal(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.obra_id || !form.empreiteiro_id) {
      toast.error('Selecione a obra e o empreiteiro.')
      return
    }
    if (!form.periodo_inicio || !form.periodo_fim) {
      toast.error('Preencha o período de início e fim.')
      return
    }
    if (!form.numero || !form.valor_bruto) {
      toast.error('Preencha o número e o valor bruto.')
      return
    }
    setSaving(true)
    try {
      await medicoesApi.criar({
        obra_id:        form.obra_id,
        empreiteiro_id: form.empreiteiro_id,
        periodo_inicio: form.periodo_inicio,
        periodo_fim:    form.periodo_fim,
        numero:         Number(form.numero),
        valor_bruto:    valorBruto,
        valor_desconto: valorDesconto,
        valor_liquido:  valorLiquido,
        status:         form.status,
      })
      toast.success('Medição criada com sucesso!')
      setShowModal(false)
      setForm(formInicial)
      recarregar()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao criar medição.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medições</h1>
          <p className="text-sm text-gray-500 mt-1">Banco de medição e aprovações</p>
        </div>
        <button
          onClick={abrirModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova Medição
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={obraId}
          onChange={e => setObraId(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        >
          <option value="">Selecione uma obra...</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(statusConfig).map(([v, l]) => (
            <option key={v} value={v}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      {obraId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="kpi-card">
            <p className="text-sm text-gray-500">Total de Medições</p>
            <p className="text-2xl font-bold mt-1">{medicoes.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-sm text-gray-500">Total Bruto</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalBruto)}</p>
          </div>
          <div className="kpi-card">
            <p className="text-sm text-gray-500">Total Líquido</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{fmt(totalLiq)}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver as medições</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                {['Nº','Empreiteiro','Período','Valor Bruto','Desconto','Valor Líquido','Status','Aprovada em'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma medição encontrada
                  </td>
                </tr>
              ) : medicoes.map(m => {
                const s = statusConfig[m.status] || { label: m.status, cls: 'badge-cinza' }
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">#{m.numero}</td>
                    <td className="px-4 py-3 text-gray-600">{(m as any).empreiteiros?.razao_social ?? m.empreiteiro_id}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(m.periodo_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(m.periodo_fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">{fmt(Number(m.valor_bruto))}</td>
                    <td className="px-4 py-3 text-red-600">{fmt(Number(m.valor_desconto))}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{fmt(Number(m.valor_liquido))}</td>
                    <td className="px-4 py-3"><span className={s.cls}>{s.label}</span></td>
                    <td className="px-4 py-3 text-gray-500">
                      {m.aprovada_em ? new Date(m.aprovada_em).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Modal Nova Medição ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">Nova Medição</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">

              {/* Obra */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Obra</label>
                <select
                  name="obra_id"
                  value={form.obra_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a obra...</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>

              {/* Empreiteiro */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Empreiteiro</label>
                <select
                  name="empreiteiro_id"
                  value={form.empreiteiro_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o empreiteiro...</option>
                  {empreiteiros.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nome_fantasia || e.razao_social}
                    </option>
                  ))}
                </select>
              </div>

              {/* Período */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Período Início <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="periodo_inicio"
                    value={form.periodo_inicio}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Período Fim <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="periodo_fim"
                    value={form.periodo_fim}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Número */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Número <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  name="numero"
                  value={form.numero}
                  onChange={handleChange}
                  required
                  min={1}
                  placeholder="Ex: 1"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Valores */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Valor Bruto (R$) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="valor_bruto"
                    value={form.valor_bruto}
                    onChange={handleChange}
                    required
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Desconto (R$)</label>
                  <input
                    type="number"
                    name="valor_desconto"
                    value={form.valor_desconto}
                    onChange={handleChange}
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Valor Líquido (readonly calculado) */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Valor Líquido (R$)</label>
                <input
                  type="text"
                  readOnly
                  value={valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm text-green-700 font-semibold cursor-not-allowed"
                />
                <p className="text-xs text-gray-400">Calculado automaticamente: Bruto − Desconto</p>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="aberta">Aberta</option>
                  <option value="fechada">Fechada</option>
                  <option value="aprovada">Aprovada</option>
                  <option value="paga">Paga</option>
                </select>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
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
