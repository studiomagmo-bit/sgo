'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  empreiteiros as empreiteirosApi,
  obras as obrasApi,
  atividades as atividadesApi,
} from '@/lib/sgoApi'
import type { Empreiteiro, Obra, Atividade, StatusAtividade } from '@/types'
import {
  HardHat, Loader2, AlertTriangle, CheckCircle2,
  Clock, ListChecks, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

// ─── Configurações de badge ───────────────────────────────────
const statusConfig: Record<StatusAtividade, { label: string; cls: string }> = {
  planejada:    { label: 'Planejada',    cls: 'badge-cinza'    },
  em_andamento: { label: 'Em Andamento', cls: 'badge-azul'     },
  concluida:    { label: 'Concluída',    cls: 'badge-verde'    },
  bloqueada:    { label: 'Bloqueada',    cls: 'badge-vermelho' },
  cancelada:    { label: 'Cancelada',    cls: 'badge-cinza'    },
}

const STATUS_OPTIONS: { value: StatusAtividade; label: string }[] = [
  { value: 'planejada',    label: 'Planejada'    },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida',    label: 'Concluída'    },
  { value: 'bloqueada',    label: 'Bloqueada'    },
  { value: 'cancelada',    label: 'Cancelada'    },
]

// ─── Helper: verifica se atividade está atrasada ──────────────
function isAtrasada(a: Atividade): boolean {
  if (!a.data_fim_prev || a.status === 'concluida' || a.status === 'cancelada') return false
  return new Date(a.data_fim_prev) < new Date()
}

// ─── Helper: formata data pt-BR ───────────────────────────────
function fmtDate(d?: string | null): string {
  if (!d) return '—'
  // Evita offset de fuso ao parsear yyyy-mm-dd
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ─── Barra de progresso ───────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const p = Math.min(100, Math.max(0, pct))
  const cor =
    p >= 100 ? 'bg-green-500' :
    p >= 50  ? 'bg-blue-500'  :
    p > 0    ? 'bg-yellow-400':
               'bg-gray-300'
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div className={clsx('h-1.5 rounded-full transition-all', cor)} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 w-8 text-right">{p}%</span>
    </div>
  )
}

// ─── Card KPI ─────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, color,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className={clsx('rounded-xl p-4 flex items-center gap-3', color)}>
      <Icon className="h-7 w-7 shrink-0 opacity-80" />
      <div>
        <p className="text-xs font-medium opacity-70">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function EmpreteiroPortalPage() {
  // ── Listas de filtro ──
  const [listaEmpreiteiros, setListaEmpreiteiros] = useState<Empreiteiro[]>([])
  const [listaObras, setListaObras]               = useState<Obra[]>([])

  // ── Seleções ──
  const [empreteiroId, setEmpreteiroId] = useState<string>('')
  const [obraId, setObraId]             = useState<string>('')
  const [filtroStatus, setFiltroStatus] = useState<string>('')

  // ── Atividades ──
  const [todasAtividades, setTodasAtividades] = useState<Atividade[]>([])
  const [loading, setLoading]                 = useState(false)

  // ── Atualização inline de status ──
  const [atualizando, setAtualizando] = useState<string | null>(null)

  // ── Carrega listas ao montar ──
  useEffect(() => {
    empreiteirosApi.listar().then(setListaEmpreiteiros)
    obrasApi.listar().then(setListaObras)
  }, [])

  // ── Carrega atividades quando empreiteiro ou obra muda ──
  const carregarAtividades = () => {
    if (!empreteiroId) {
      setTodasAtividades([])
      return
    }
    setLoading(true)
    atividadesApi
      .listar(obraId ? { obra_id: obraId } : undefined)
      .then(data => setTodasAtividades(data as Atividade[]))
      .catch(err => toast.error(err?.message ?? 'Erro ao carregar atividades'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    carregarAtividades()
  }, [empreteiroId, obraId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtragem client-side ──
  const atividades = useMemo(() => {
    let lista = todasAtividades.filter(a => a.empreiteiro_id === empreteiroId)
    if (filtroStatus) lista = lista.filter(a => a.status === filtroStatus)
    return lista
  }, [todasAtividades, empreteiroId, filtroStatus])

  // ── KPIs ──
  const kpis = useMemo(() => {
    // Usa todas as atividades do empreiteiro (sem filtro de status) para os KPIs
    const base = todasAtividades.filter(a => a.empreiteiro_id === empreteiroId)
    return {
      total:       base.length,
      emAndamento: base.filter(a => a.status === 'em_andamento').length,
      atrasadas:   base.filter(isAtrasada).length,
      concluidas:  base.filter(a => a.status === 'concluida').length,
    }
  }, [todasAtividades, empreteiroId])

  // ── Atualiza status inline ──
  const handleAtualizarStatus = async (id: string, novoStatus: StatusAtividade) => {
    setAtualizando(id)
    try {
      await atividadesApi.atualizar(id, { status: novoStatus })
      toast.success('Status atualizado com sucesso!')
      carregarAtividades()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao atualizar status')
    } finally {
      setAtualizando(null)
    }
  }

  // ── Nome do empreiteiro selecionado ──
  const empreteiroSelecionado = listaEmpreiteiros.find(e => e.id === empreteiroId)

  // ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Portal do Empreiteiro</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {empreteiroSelecionado
              ? `Visualizando painel de: ${empreteiroSelecionado.nome_fantasia || empreteiroSelecionado.razao_social}`
              : 'Selecione um empreiteiro para visualizar suas atividades'}
          </p>
        </div>

        {empreteiroId && (
          <button
            onClick={carregarAtividades}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            Recarregar
          </button>
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filtros</p>
        <div className="flex flex-wrap gap-3">

          {/* Empreiteiro — obrigatório */}
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="text-xs font-medium text-gray-600">
              Empreiteiro <span className="text-red-500">*</span>
            </label>
            <select
              value={empreteiroId}
              onChange={e => setEmpreteiroId(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um empreiteiro...</option>
              {listaEmpreiteiros.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nome_fantasia || e.razao_social}
                </option>
              ))}
            </select>
          </div>

          {/* Obra — opcional */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Obra</label>
            <select
              value={obraId}
              onChange={e => setObraId(e.target.value)}
              disabled={!empreteiroId}
              className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Todas as obras</option>
              {listaObras.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>

          {/* Status — opcional */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              disabled={!empreteiroId}
              className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ── Estado vazio: nenhum empreiteiro selecionado ── */}
      {!empreteiroId && (
        <div className="rounded-xl border bg-white p-16 text-center text-gray-400 shadow-sm">
          <HardHat className="h-14 w-14 mx-auto mb-4 text-gray-200" />
          <p className="text-base font-medium text-gray-500">Nenhum empreiteiro selecionado</p>
          <p className="text-sm mt-1">Selecione um empreiteiro no filtro acima para ver seus dados</p>
        </div>
      )}

      {/* ── Conteúdo principal (após empreiteiro selecionado) ── */}
      {empreteiroId && (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Total de Atividades"
              value={kpis.total}
              icon={ListChecks}
              color="bg-slate-100 text-slate-800"
            />
            <KpiCard
              label="Em Andamento"
              value={kpis.emAndamento}
              icon={Clock}
              color="bg-blue-100 text-blue-800"
            />
            <KpiCard
              label="Atrasadas"
              value={kpis.atrasadas}
              icon={AlertTriangle}
              color="bg-red-100 text-red-800"
            />
            <KpiCard
              label="Concluídas"
              value={kpis.concluidas}
              icon={CheckCircle2}
              color="bg-green-100 text-green-800"
            />
          </div>

          {/* ── Tabela ── */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
                <p className="text-sm font-semibold text-gray-700">
                  Atividades
                  {filtroStatus && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      · filtrado por "{statusConfig[filtroStatus as StatusAtividade]?.label}"
                    </span>
                  )}
                </p>
                <span className="text-xs text-gray-400">{atividades.length} registro(s)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      {['Atividade', 'Obra', 'Área', 'Prazo', '% Exec', 'Status', 'Ações'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {atividades.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                          <HardHat className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                          <p>Nenhuma atividade encontrada para este empreiteiro</p>
                        </td>
                      </tr>
                    ) : atividades.map(a => {
                      const atrasada = isAtrasada(a)
                      const s = statusConfig[a.status] ?? { label: a.status, cls: 'badge-cinza' }
                      const obraNome = (a as any).obras?.nome ?? '—'

                      return (
                        <tr
                          key={a.id}
                          className={clsx(
                            'hover:bg-slate-50 transition-colors',
                            atrasada && 'bg-red-50/60 hover:bg-red-50',
                          )}
                        >
                          {/* Atividade */}
                          <td className="px-4 py-3 max-w-[220px]">
                            <div className="flex items-center gap-2">
                              {atrasada && (
                                <span title="Atrasada">
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                </span>
                              )}
                              <span className="font-medium text-gray-900 truncate">{a.nome}</span>
                            </div>
                            {atrasada && (
                              <span className="ml-5 inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full mt-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Atrasada
                              </span>
                            )}
                          </td>

                          {/* Obra */}
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap max-w-[160px] truncate">
                            {obraNome}
                          </td>

                          {/* Área */}
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {a.local || '—'}
                          </td>

                          {/* Prazo */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={clsx(
                                'text-sm',
                                atrasada ? 'text-red-600 font-semibold' : 'text-gray-500',
                              )}
                            >
                              {fmtDate(a.data_fim_prev)}
                            </span>
                          </td>

                          {/* % Exec */}
                          <td className="px-4 py-3">
                            <ProgressBar pct={Number(a.percentual_exec)} />
                          </td>

                          {/* Status badge */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={s.cls}>{s.label}</span>
                          </td>

                          {/* Ações — dropdown inline */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {atualizando === a.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              ) : (
                                <select
                                  value={a.status}
                                  onChange={e =>
                                    handleAtualizarStatus(a.id, e.target.value as StatusAtividade)
                                  }
                                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
                                  title="Atualizar status"
                                >
                                  {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
