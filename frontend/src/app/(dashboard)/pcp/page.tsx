'use client'
import { useEffect, useState } from 'react'
import { atividades as pcpAtividades, obras as obrasApi, estruturaObra } from '@/lib/sgoApi'
import type { Atividade, Obra, StatusAtividade, PrioridadeAtividade } from '@/types'
import { Plus, Filter, Loader2, GitBranch, AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

// ─── Configs de badge ────────────────────────────────────────
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

// ─── Tipos do formulário ─────────────────────────────────────
interface AtividadeForm {
  nome: string
  obra_id: string
  estrutura_id: string
  status: StatusAtividade
  prioridade: PrioridadeAtividade
  percentual_exec: number
  data_inicio_prev: string
  data_fim_prev: string
  descricao: string
}

const FORM_INICIAL: AtividadeForm = {
  nome: '',
  obra_id: '',
  estrutura_id: '',
  status: 'planejada',
  prioridade: 'media',
  percentual_exec: 0,
  data_inicio_prev: '',
  data_fim_prev: '',
  descricao: '',
}

// ─── Helper: monta opções de estrutura com indentação hierárquica ──
function buildOptions(
  nodes: any[],
  parentId: string | null = null,
  nivel = 0,
): { id: string; label: string }[] {
  return nodes
    .filter(n => (n.parent_id ?? null) === parentId)
    .flatMap(n => [
      {
        id: n.id,
        label: '  '.repeat(nivel) + (nivel > 0 ? '└ ' : '') + n.nome + ` (${n.tipo})`,
      },
      ...buildOptions(nodes, n.id, nivel + 1),
    ])
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
export default function PCPPage() {
  const [obras, setObras]           = useState<Obra[]>([])
  const [obraId, setObraId]         = useState('')
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading]       = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  // ── Modal ──
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState<AtividadeForm>(FORM_INICIAL)
  const [saving, setSaving]         = useState(false)

  // ── Estrutura carregada para o modal ──
  const [estruturaOpcoes, setEstruturaOpcoes]       = useState<{ id: string; label: string }[]>([])
  const [loadingEstrutura, setLoadingEstrutura]     = useState(false)

  // ── Carga inicial ──
  useEffect(() => { obrasApi.listar().then(setObras) }, [])

  const carregarAtividades = () => {
    if (!obraId) return
    setLoading(true)
    pcpAtividades
      .listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(setAtividades)
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregarAtividades() }, [obraId, filtroStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carrega estrutura quando obra_id muda no formulário ──
  useEffect(() => {
    if (!form.obra_id) {
      setEstruturaOpcoes([])
      return
    }
    setLoadingEstrutura(true)
    setForm(prev => ({ ...prev, estrutura_id: '' }))
    estruturaObra
      .listar(form.obra_id)
      .then(nodes => setEstruturaOpcoes(buildOptions(nodes)))
      .catch(() => setEstruturaOpcoes([]))
      .finally(() => setLoadingEstrutura(false))
  }, [form.obra_id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Handlers do modal ──
  const abrirModal = () => {
    setForm({ ...FORM_INICIAL, obra_id: obraId })
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setForm(FORM_INICIAL)
    setEstruturaOpcoes([])
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
        estrutura_id:     form.estrutura_id     || null,
        // valores obrigatórios com default
        quantidade_prev: 0,
        quantidade_exec: 0,
        bloqueada:       false,
        libera_medicao:  false,
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

      {/* Tabela */}
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
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                {['Atividade','Local','Progresso','Prev. Qtd','Exec. Qtd','Início','Fim','Status','Prioridade'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {atividades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma atividade encontrada
                  </td>
                </tr>
              ) : atividades.map(a => {
                const s = statusConfig[a.status]    || { label: a.status,    cls: 'badge-cinza' }
                const p = prioridadeConfig[a.prioridade] || { label: a.prioridade, cls: 'badge-cinza' }
                return (
                  <tr key={a.id} className={clsx('hover:bg-slate-50', a.bloqueada && 'bg-red-50')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.bloqueada && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <span className="font-medium text-gray-900">{a.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.local || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${a.percentual_exec}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{a.percentual_exec}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {Number(a.quantidade_prev).toLocaleString('pt-BR')} {a.unidade}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {Number(a.quantidade_exec).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.data_inicio_prev ? new Date(a.data_inicio_prev).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.data_fim_prev ? new Date(a.data_fim_prev).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3"><span className={s.cls}>{s.label}</span></td>
                    <td className="px-4 py-3"><span className={p.cls}>{p.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Nova Atividade ────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header do modal */}
            <div className="flex items-center justify-between p-5 border-b">
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

              {/* Área / Estrutura — aparece após obra ser selecionada */}
              <Campo label="Área / Estrutura">
                <div className="relative">
                  <select
                    value={form.estrutura_id}
                    onChange={e => set('estrutura_id', e.target.value)}
                    disabled={!form.obra_id || loadingEstrutura}
                    className={clsx(
                      inputCls,
                      (!form.obra_id || loadingEstrutura) && 'opacity-60 cursor-not-allowed bg-gray-50',
                    )}
                  >
                    <option value="">— Sem área específica —</option>
                    {estruturaOpcoes.map(op => (
                      <option key={op.id} value={op.id}>{op.label}</option>
                    ))}
                  </select>
                  {loadingEstrutura && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>
                {!form.obra_id && (
                  <p className="text-xs text-gray-400 mt-1">Selecione uma obra para ver as áreas disponíveis.</p>
                )}
              </Campo>

              {/* Status + Prioridade lado a lado */}
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

              {/* Datas lado a lado */}
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
