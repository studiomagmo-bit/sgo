'use client'
import { useEffect, useState } from 'react'
import {
  atividades as pcpAtividades,
  obras as obrasApi,
  estruturaObra,
  empreiteiros as empreiteirosApi,
} from '@/lib/sgoApi'
import type { Atividade, Obra, StatusAtividade, PrioridadeAtividade } from '@/types'
import { Plus, Loader2, GitBranch, AlertTriangle, X, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

// ─── Configs de badge ─────────────────────────────────────────
const statusConfig: Record<string, { label: string; cls: string }> = {
  planejada:    { label: 'Planejada',    cls: 'badge-cinza'    },
  em_andamento: { label: 'Em Andamento', cls: 'badge-azul'     },
  concluida:    { label: 'Concluída',    cls: 'badge-verde'    },
  bloqueada:    { label: 'Bloqueada',    cls: 'badge-vermelho' },
  cancelada:    { label: 'Cancelada',    cls: 'badge-cinza'    },
}

const prioridadeConfig: Record<string, { label: string; cls: string }> = {
  baixa:   { label: 'Baixa',   cls: 'badge-cinza'    },
  media:   { label: 'Média',   cls: 'badge-azul'     },
  alta:    { label: 'Alta',    cls: 'badge-amarelo'  },
  critica: { label: 'Crítica', cls: 'badge-vermelho' },
}

// ─── Tipo nó de estrutura ─────────────────────────────────────
interface EstruturaNo {
  id: string
  nome: string
  tipo: string
  parent_id: string | null
  ordem: number
}

// ─── Tipo empreiteiro (mínimo) ────────────────────────────────
interface Empreiteiro {
  id: string
  razao_social: string
}

// ─── Tipos do formulário ──────────────────────────────────────
interface AtividadeForm {
  nome: string
  obra_id: string
  status: StatusAtividade
  prioridade: PrioridadeAtividade
  percentual_exec: number
  data_inicio_prev: string
  data_fim_prev: string
  descricao: string
  empreiteiro_id: string
  quantidade_prev: number
  unidade: string
}

const FORM_INICIAL: AtividadeForm = {
  nome: '',
  obra_id: '',
  status: 'planejada',
  prioridade: 'media',
  percentual_exec: 0,
  data_inicio_prev: '',
  data_fim_prev: '',
  descricao: '',
  empreiteiro_id: '',
  quantidade_prev: 0,
  unidade: '',
}

// ─── Componente Campo ─────────────────────────────────────────
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

// ─── Página principal ─────────────────────────────────────────
export default function PCPPage() {
  // ── Dados de referência ──
  const [obras, setObras]               = useState<Obra[]>([])
  const [empreiteiros, setEmpreiteiros] = useState<Empreiteiro[]>([])

  // ── Filtros da listagem ──
  const [obraId, setObraId]             = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // ── Listagem ──
  const [atividades, setAtividades]     = useState<Atividade[]>([])
  const [loading, setLoading]           = useState(false)

  // ── Modal ──
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState<AtividadeForm>(FORM_INICIAL)
  const [saving, setSaving]             = useState(false)

  // ── Estrutura em cascata ──
  const [estruturaNos, setEstruturaNos]   = useState<EstruturaNo[]>([])
  const [loadingEstrutura, setLoadingEstrutura] = useState(false)
  const [estruturaNv1, setEstruturaNv1]   = useState('')
  const [estruturaNv2, setEstruturaNv2]   = useState('')
  const [estruturaNv3, setEstruturaNv3]   = useState('')

  // ── Inline status edit ──
  const [editandoStatusId, setEditandoStatusId] = useState<string | null>(null)

  // ── Carga inicial ──
  useEffect(() => {
    obrasApi.listar().then(setObras)
    empreiteirosApi.listar().then(setEmpreiteiros)
  }, [])

  // ── Carrega atividades ao mudar filtros ──
  const carregarAtividades = () => {
    if (!obraId) return
    setLoading(true)
    pcpAtividades
      .listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(setAtividades)
      .catch(() => toast.error('Erro ao carregar atividades'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregarAtividades() }, [obraId, filtroStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carrega nós de estrutura quando obra muda no formulário ──
  useEffect(() => {
    if (!form.obra_id) {
      setEstruturaNos([])
      resetEstrutura()
      return
    }
    setLoadingEstrutura(true)
    resetEstrutura()
    estruturaObra
      .listar(form.obra_id)
      .then(nos => setEstruturaNos(nos as EstruturaNo[]))
      .catch(() => setEstruturaNos([]))
      .finally(() => setLoadingEstrutura(false))
  }, [form.obra_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers cascata ──
  const resetEstrutura = () => {
    setEstruturaNv1('')
    setEstruturaNv2('')
    setEstruturaNv3('')
  }

  const raizes    = estruturaNos.filter(n => (n.parent_id ?? null) === null)
  const filhosNv1 = estruturaNv1 ? estruturaNos.filter(n => n.parent_id === estruturaNv1) : []
  const filhosNv2 = estruturaNv2 ? estruturaNos.filter(n => n.parent_id === estruturaNv2) : []

  // estrutura_id final = nó mais profundo selecionado
  const estruturaIdFinal = estruturaNv3 || estruturaNv2 || estruturaNv1 || null

  // ── KPIs ──
  const totais = {
    total:        atividades.length,
    concluidas:   atividades.filter(a => a.status === 'concluida').length,
    em_andamento: atividades.filter(a => a.status === 'em_andamento').length,
    bloqueadas:   atividades.filter(a => a.status === 'bloqueada').length,
    percMedio:    atividades.length
      ? Math.round(atividades.reduce((s, a) => s + Number(a.percentual_exec), 0) / atividades.length)
      : 0,
  }

  // ── Lookups para a tabela ──
  const estruturaMap = Object.fromEntries(estruturaNos.map(n => [n.id, n.nome]))

  // ── Handlers do modal ──
  const abrirModal = () => {
    setForm({ ...FORM_INICIAL, obra_id: obraId })
    resetEstrutura()
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setForm(FORM_INICIAL)
    resetEstrutura()
    setEstruturaNos([])
  }

  const set = (field: keyof AtividadeForm, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    if (!form.obra_id)      { toast.error('Selecione uma obra'); return }

    setSaving(true)
    try {
      await pcpAtividades.criar({
        nome:             form.nome.trim(),
        obra_id:          form.obra_id,
        status:           form.status,
        prioridade:       form.prioridade,
        percentual_exec:  Number(form.percentual_exec),
        data_inicio_prev: form.data_inicio_prev || null,
        data_fim_prev:    form.data_fim_prev    || null,
        descricao:        form.descricao        || null,
        estrutura_id:     estruturaIdFinal,
        empreiteiro_id:   form.empreiteiro_id   || null,
        quantidade_prev:  Number(form.quantidade_prev),
        unidade:          form.unidade          || null,
        quantidade_exec:  0,
        bloqueada:        false,
        libera_medicao:   false,
      })
      toast.success('Atividade criada com sucesso!')
      fecharModal()
      carregarAtividades()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao criar atividade')
    } finally {
      setSaving(false)
    }
  }

  // ── Atualização inline de status ──
  const atualizarStatus = async (id: string, novoStatus: StatusAtividade) => {
    try {
      await pcpAtividades.atualizar(id, { status: novoStatus })
      setAtividades(prev => prev.map(a => a.id === id ? { ...a, status: novoStatus } : a))
      toast.success('Status atualizado')
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setEditandoStatusId(null)
    }
  }

  // ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PCP — Atividades</h1>
          <p className="text-sm text-gray-500 mt-1">Planejamento e controle de produção</p>
        </div>
        <button
          onClick={abrirModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova Atividade
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { l: 'Total',        v: totais.total,           c: 'bg-slate-100 text-slate-800'   },
            { l: 'Concluídas',   v: totais.concluidas,      c: 'bg-green-100 text-green-800'   },
            { l: 'Em Andamento', v: totais.em_andamento,    c: 'bg-blue-100  text-blue-800'    },
            { l: 'Bloqueadas',   v: totais.bloqueadas,      c: 'bg-red-100   text-red-800'     },
            { l: '% Médio',      v: `${totais.percMedio}%`, c: 'bg-purple-100 text-purple-800' },
          ].map(k => (
            <div key={k.l} className={`rounded-xl p-3 text-center ${k.c}`}>
              <p className="text-xs font-medium opacity-70">{k.l}</p>
              <p className="text-xl font-bold mt-0.5">{k.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela de atividades */}
      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver as atividades</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                {['Atividade', 'Estrutura', 'Empreiteiro', 'Prazo', '%', 'Status', 'Prioridade'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {atividades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma atividade encontrada
                  </td>
                </tr>
              ) : atividades.map(a => {
                const s    = statusConfig[a.status]       || { label: a.status,    cls: 'badge-cinza' }
                const p    = prioridadeConfig[a.prioridade] || { label: a.prioridade, cls: 'badge-cinza' }
                const nomEstr  = a.estrutura_id ? (estruturaMap[a.estrutura_id] ?? a.estrutura_id) : '—'
                // empreiteiro pode vir via join ou não
                const nomeEmp  = (a as any).empreiteiros?.razao_social
                  ?? (empreiteiros.find(e => e.id === (a as any).empreiteiro_id)?.razao_social)
                  ?? '—'
                const prazo    = [
                  a.data_inicio_prev ? new Date(a.data_inicio_prev).toLocaleDateString('pt-BR') : null,
                  a.data_fim_prev    ? new Date(a.data_fim_prev).toLocaleDateString('pt-BR')    : null,
                ].filter(Boolean).join(' → ') || '—'

                return (
                  <tr
                    key={a.id}
                    className={clsx('hover:bg-slate-50 transition-colors', a.bloqueada && 'bg-red-50')}
                  >
                    {/* ATIVIDADE */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.bloqueada && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <div>
                          <span className="font-medium text-gray-900 block">{a.nome}</span>
                          {(a as any).unidade && (
                            <span className="text-xs text-gray-400">
                              {Number(a.quantidade_prev).toLocaleString('pt-BR')} {(a as any).unidade}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ESTRUTURA */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{nomEstr}</td>

                    {/* EMPREITEIRO */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{nomeEmp}</td>

                    {/* PRAZO */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{prazo}</td>

                    {/* % */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[72px]">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${a.percentual_exec}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-7 text-right">{a.percentual_exec}%</span>
                      </div>
                    </td>

                    {/* STATUS — dropdown inline */}
                    <td className="px-4 py-3">
                      {editandoStatusId === a.id ? (
                        <select
                          autoFocus
                          defaultValue={a.status}
                          onBlur={() => setEditandoStatusId(null)}
                          onChange={e => atualizarStatus(a.id, e.target.value as StatusAtividade)}
                          className="rounded border border-blue-400 px-1 py-0.5 text-xs focus:outline-none"
                        >
                          {Object.entries(statusConfig).map(([v, l]) => (
                            <option key={v} value={v}>{l.label}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditandoStatusId(a.id)}
                          title="Clique para editar"
                          className="inline-flex items-center gap-1 cursor-pointer group"
                        >
                          <span className={s.cls}>{s.label}</span>
                          <ChevronDown className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>

                    {/* PRIORIDADE */}
                    <td className="px-4 py-3">
                      <span className={p.cls}>{p.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Nova Atividade ───────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Nova Atividade</h2>
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

              {/* Nome */}
              <Campo label="Nome da Atividade *">
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                  placeholder="Ex.: Concretagem Laje Pav. 1"
                  className={inputCls}
                />
              </Campo>

              {/* Obra */}
              <Campo label="Obra *">
                <select
                  required
                  value={form.obra_id}
                  onChange={e => set('obra_id', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Selecione...</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </Campo>

              {/* ── Seletor Cascata de Estrutura ─── */}
              {form.obra_id && (
                <div className="space-y-3 rounded-lg border border-dashed border-gray-200 p-3 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    Localização na Estrutura
                    {loadingEstrutura && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                  </p>

                  {/* Nível 1 */}
                  <Campo label="Área — Nível 1">
                    <select
                      value={estruturaNv1}
                      onChange={e => {
                        setEstruturaNv1(e.target.value)
                        setEstruturaNv2('')
                        setEstruturaNv3('')
                      }}
                      disabled={loadingEstrutura || raizes.length === 0}
                      className={clsx(inputCls, (loadingEstrutura || raizes.length === 0) && 'opacity-60 cursor-not-allowed bg-white')}
                    >
                      <option value="">— Nenhum —</option>
                      {raizes.map(n => (
                        <option key={n.id} value={n.id}>{n.nome} ({n.tipo})</option>
                      ))}
                    </select>
                  </Campo>

                  {/* Nível 2 — só aparece se nível 1 tiver filhos */}
                  {estruturaNv1 && filhosNv1.length > 0 && (
                    <Campo label="Área — Nível 2">
                      <select
                        value={estruturaNv2}
                        onChange={e => {
                          setEstruturaNv2(e.target.value)
                          setEstruturaNv3('')
                        }}
                        className={inputCls}
                      >
                        <option value="">— Nenhum —</option>
                        {filhosNv1.map(n => (
                          <option key={n.id} value={n.id}>{n.nome} ({n.tipo})</option>
                        ))}
                      </select>
                    </Campo>
                  )}

                  {/* Nível 3 — só aparece se nível 2 tiver filhos */}
                  {estruturaNv2 && filhosNv2.length > 0 && (
                    <Campo label="Área — Nível 3">
                      <select
                        value={estruturaNv3}
                        onChange={e => setEstruturaNv3(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">— Nenhum —</option>
                        {filhosNv2.map(n => (
                          <option key={n.id} value={n.id}>{n.nome} ({n.tipo})</option>
                        ))}
                      </select>
                    </Campo>
                  )}

                  {/* Resumo do ID final */}
                  {estruturaIdFinal && (
                    <p className="text-xs text-blue-600">
                      Estrutura selecionada: <strong>{estruturaMap[estruturaIdFinal] ?? estruturaIdFinal}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Empreiteiro */}
              <Campo label="Empreiteiro">
                <select
                  value={form.empreiteiro_id}
                  onChange={e => set('empreiteiro_id', e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Sem empreiteiro —</option>
                  {empreiteiros.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.razao_social}</option>
                  ))}
                </select>
              </Campo>

              {/* Status + Prioridade */}
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Status">
                  <select
                    value={form.status}
                    onChange={e => set('status', e.target.value as StatusAtividade)}
                    className={inputCls}
                  >
                    <option value="planejada">Planejada</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="bloqueada">Bloqueada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </Campo>

                <Campo label="Prioridade">
                  <select
                    value={form.prioridade}
                    onChange={e => set('prioridade', e.target.value as PrioridadeAtividade)}
                    className={inputCls}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </Campo>
              </div>

              {/* Quantidade prevista + Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Quantidade prevista">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.quantidade_prev}
                    onChange={e => set('quantidade_prev', Number(e.target.value))}
                    className={inputCls}
                  />
                </Campo>

                <Campo label="Unidade">
                  <input
                    type="text"
                    value={form.unidade}
                    onChange={e => set('unidade', e.target.value)}
                    placeholder="m², un, hr, m³..."
                    className={inputCls}
                  />
                </Campo>
              </div>

              {/* Percentual executado */}
              <Campo label="Percentual Executado (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.percentual_exec}
                  onChange={e => set('percentual_exec', Number(e.target.value))}
                  className={inputCls}
                />
              </Campo>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Data Início Prevista">
                  <input
                    type="date"
                    value={form.data_inicio_prev}
                    onChange={e => set('data_inicio_prev', e.target.value)}
                    className={inputCls}
                  />
                </Campo>

                <Campo label="Data Fim Prevista">
                  <input
                    type="date"
                    value={form.data_fim_prev}
                    onChange={e => set('data_fim_prev', e.target.value)}
                    className={inputCls}
                  />
                </Campo>
              </div>

              {/* Descrição */}
              <Campo label="Descrição">
                <textarea
                  rows={3}
                  value={form.descricao}
                  onChange={e => set('descricao', e.target.value)}
                  placeholder="Detalhes adicionais da atividade..."
                  className={`${inputCls} resize-none`}
                />
              </Campo>

              {/* Rodapé */}
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
