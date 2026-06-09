'use client'
import { useEffect, useState } from 'react'
import {
  producoes as producoesApi,
  obras     as obrasApi,
  atividades as pcpAtividades,
} from '@/lib/sgoApi'
import type { Producao, Obra, Atividade, TipoProducao } from '@/types'
import { Plus, Loader2, ClipboardList, X } from 'lucide-react'
import { toast } from 'sonner'

// ─── Helpers ─────────────────────────────────────────────────
const hoje = () => new Date().toISOString().split('T')[0]

// ─── Tipos do formulário ─────────────────────────────────────
interface ProducaoForm {
  obra_id:      string
  atividade_id: string
  data:         string
  tipo:         TipoProducao
  quantidade:   number
  observacoes:  string
}

const FORM_INICIAL: ProducaoForm = {
  obra_id:      '',
  atividade_id: '',
  data:         hoje(),
  tipo:         'producao',
  quantidade:   0,
  observacoes:  '',
}

// ─── Componente de campo label + input ───────────────────────
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

// ─── Página principal ────────────────────────────────────────
export default function ProducoesPage() {
  const [obras, setObras]         = useState<Obra[]>([])
  const [obraId, setObraId]       = useState('')
  const [producoes, setProducoes] = useState<Producao[]>([])
  const [loading, setLoading]     = useState(false)

  // ── Modal ──
  const [showModal, setShowModal]     = useState(false)
  const [form, setForm]               = useState<ProducaoForm>(FORM_INICIAL)
  const [saving, setSaving]           = useState(false)
  const [modalObras, setModalObras]   = useState<Obra[]>([])
  const [atividadesModal, setAtividadesModal] = useState<Atividade[]>([])
  const [loadingAtiv, setLoadingAtiv] = useState(false)

  // ── Carga inicial ──
  useEffect(() => { obrasApi.listar().then(setObras) }, [])

  const carregarProducoes = () => {
    if (!obraId) return
    setLoading(true)
    producoesApi.listar({ obra_id: obraId }).then(setProducoes).finally(() => setLoading(false))
  }

  useEffect(() => { carregarProducoes() }, [obraId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── KPIs ──
  const totalProd = producoes.reduce((s, p) => s + Number(p.quantidade), 0)

  // ── Handlers do modal ──
  const abrirModal = () => {
    // Pré-popula obras no modal (re-usa o estado já carregado)
    setModalObras(obras)
    setForm({ ...FORM_INICIAL, obra_id: obraId, data: hoje() })
    setAtividadesModal([])
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setForm(FORM_INICIAL)
    setAtividadesModal([])
  }

  const set = (field: keyof ProducaoForm, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  // Quando obra muda no modal, recarrega atividades e limpa seleção
  const handleObraModal = async (obraIdSelecionada: string) => {
    set('obra_id', obraIdSelecionada)
    set('atividade_id', '')
    setAtividadesModal([])
    if (!obraIdSelecionada) return
    setLoadingAtiv(true)
    try {
      const lista = await pcpAtividades.listar({ obra_id: obraIdSelecionada })
      setAtividadesModal(lista)
    } catch {
      toast.error('Erro ao carregar atividades da obra')
    } finally {
      setLoadingAtiv(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.obra_id)      { toast.error('Selecione uma obra'); return }
    if (!form.atividade_id) { toast.error('Selecione uma atividade'); return }
    if (!form.quantidade || form.quantidade <= 0) { toast.error('Informe uma quantidade válida'); return }

    setSaving(true)
    try {
      await producoesApi.criar({
        obra_id:      form.obra_id,
        atividade_id: form.atividade_id,
        data:         form.data,
        tipo:         form.tipo,
        quantidade:   Number(form.quantidade),
        observacoes:  form.observacoes || null,
      })
      toast.success('Produção registrada com sucesso!')
      fecharModal()
      // Se a obra do modal coincidir com o filtro ativo, recarrega a lista
      if (form.obra_id === obraId) carregarProducoes()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao registrar produção')
    } finally {
      setSaving(false)
    }
  }

  // ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produções</h1>
          <p className="text-sm text-gray-500 mt-1">Apontamentos de produção por atividade</p>
        </div>
        <button
          onClick={abrirModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova Produção
        </button>
      </div>

      {/* Filtro de obra */}
      <select
        value={obraId}
        onChange={e => setObraId(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
      >
        <option value="">Selecione uma obra...</option>
        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

      {/* KPIs */}
      {obraId && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="kpi-card">
            <p className="text-sm text-muted-foreground">Lançamentos</p>
            <p className="text-2xl font-bold mt-1">{producoes.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-sm text-muted-foreground">Total Produzido</p>
            <p className="text-2xl font-bold mt-1">{totalProd.toLocaleString('pt-BR')}</p>
          </div>
          <div className="kpi-card">
            <p className="text-sm text-muted-foreground">Com Rateio</p>
            <p className="text-2xl font-bold mt-1">
              {producoes.filter(p => p.individual && p.individual.length > 0).length}
            </p>
          </div>
        </div>
      )}

      {/* Tabela */}
      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver as produções</p>
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
                {['Data','Atividade','Empreiteiro','Tipo','Quantidade','Rateio','Observação'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {producoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma produção encontrada
                  </td>
                </tr>
              ) : producoes.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{new Date(p.data).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.atividade_id.substring(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.empreiteiro_id?.substring(0, 8) ?? '—'}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span className="badge-azul">{p.tipo}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {Number(p.quantidade).toLocaleString('pt-BR')} {p.unidade}
                  </td>
                  <td className="px-4 py-3">
                    {p.individual && p.individual.length > 0
                      ? <span className="badge-verde">{p.individual.length} colab.</span>
                      : <span className="badge-cinza">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                    {p.observacoes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Nova Produção ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header do modal */}
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Nova Produção</h2>
              <button
                onClick={fecharModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Obra */}
              <Campo label="Obra *">
                <select
                  required
                  value={form.obra_id}
                  onChange={e => handleObraModal(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Selecione...</option>
                  {modalObras.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </Campo>

              {/* Atividade (filtrada por obra) */}
              <Campo label="Atividade *">
                <select
                  required
                  value={form.atividade_id}
                  onChange={e => set('atividade_id', e.target.value)}
                  disabled={!form.obra_id || loadingAtiv}
                  className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`}
                >
                  <option value="">
                    {loadingAtiv
                      ? 'Carregando...'
                      : !form.obra_id
                      ? 'Selecione uma obra primeiro'
                      : 'Selecione...'}
                  </option>
                  {atividadesModal.map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </Campo>

              {/* Data + Tipo lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Data *">
                  <input
                    type="date"
                    required
                    value={form.data}
                    onChange={e => set('data', e.target.value)}
                    className={inputCls}
                  />
                </Campo>

                <Campo label="Tipo *">
                  <select
                    required
                    value={form.tipo}
                    onChange={e => set('tipo', e.target.value as TipoProducao)}
                    className={inputCls}
                  >
                    <option value="producao">Produção</option>
                    <option value="hora">Hora</option>
                    <option value="diaria">Diária</option>
                  </select>
                </Campo>
              </div>

              {/* Quantidade */}
              <Campo label="Quantidade *">
                <input
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={form.quantidade || ''}
                  onChange={e => set('quantidade', Number(e.target.value))}
                  placeholder="0"
                  className={inputCls}
                />
              </Campo>

              {/* Observações */}
              <Campo label="Observações">
                <textarea
                  rows={3}
                  value={form.observacoes}
                  onChange={e => set('observacoes', e.target.value)}
                  placeholder="Observações sobre o apontamento..."
                  className={`${inputCls} resize-none`}
                />
              </Campo>

              {/* Rodapé com ações */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
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
