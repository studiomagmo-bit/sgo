'use client'
import { useEffect, useState, useMemo } from 'react'
import { dashboard as dashboardApi, obras as obrasApi } from '@/lib/sgoApi'
import {
  BarChart3, CheckCircle2, Clock, TrendingDown, TrendingUp,
  AlertTriangle, Loader2, Building2, HardHat, GitBranch,
  ArrowUpRight, ArrowDownRight, Minus, Filter, RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

// ── Tipos de desvio ────────────────────────────────────────────
type StatusDesvio = 'adiantada' | 'no_prazo' | 'em_risco' | 'atrasada' | 'nao_iniciada' | 'concluida' | 'sem_prazo'

function calcDesvio(a: any): { planejado: number | null; desvio: number | null; statusDesvio: StatusDesvio } {
  if (a.status === 'concluida') return { planejado: 100, desvio: null, statusDesvio: 'concluida' }
  if (!a.data_inicio_prev || !a.data_fim_prev) return { planejado: null, desvio: null, statusDesvio: 'sem_prazo' }

  const hoje  = new Date()
  const inicio = new Date(a.data_inicio_prev + 'T12:00:00')
  const fim    = new Date(a.data_fim_prev    + 'T12:00:00')

  if (hoje < inicio) {
    // Não iniciada ainda
    const desvio = (a.percentual_exec || 0) - 0
    return { planejado: 0, desvio, statusDesvio: 'nao_iniciada' }
  }

  const totalMs   = fim.getTime()   - inicio.getTime()
  const passadoMs = hoje.getTime()  - inicio.getTime()
  const planejado = totalMs <= 0 ? 100 : Math.min(100, Math.round((passadoMs / totalMs) * 100))
  const desvio    = (a.percentual_exec || 0) - planejado

  let statusDesvio: StatusDesvio
  if (desvio > 5)         statusDesvio = 'adiantada'
  else if (desvio >= -5)  statusDesvio = 'no_prazo'
  else if (desvio >= -25) statusDesvio = 'em_risco'
  else                    statusDesvio = 'atrasada'

  return { planejado, desvio, statusDesvio }
}

const STATUS_LABEL: Record<StatusDesvio, string> = {
  adiantada:   'Adiantada',
  no_prazo:    'No prazo',
  em_risco:    'Em risco',
  atrasada:    'Atrasada',
  nao_iniciada:'Não iniciada',
  concluida:   'Concluída',
  sem_prazo:   'Sem prazo',
}
const STATUS_COLOR: Record<StatusDesvio, string> = {
  adiantada:    'bg-emerald-100 text-emerald-700 border-emerald-300',
  no_prazo:     'bg-blue-100    text-blue-700    border-blue-300',
  em_risco:     'bg-amber-100   text-amber-700   border-amber-300',
  atrasada:     'bg-red-100     text-red-700     border-red-300',
  nao_iniciada: 'bg-gray-100    text-gray-500    border-gray-300',
  concluida:    'bg-teal-100    text-teal-700    border-teal-300',
  sem_prazo:    'bg-gray-50     text-gray-400    border-gray-200',
}

const PRIORIDADE_COLOR: Record<string, string> = {
  critica: 'text-red-600', alta: 'text-orange-500',
  media: 'text-amber-600', baixa: 'text-gray-400',
}
const STATUS_BAR: Record<StatusDesvio, string> = {
  adiantada:    'bg-emerald-500',
  no_prazo:     'bg-blue-500',
  em_risco:     'bg-yellow-500',
  atrasada:     'bg-red-500',
  nao_iniciada: 'bg-gray-200',
  concluida:    'bg-teal-500',
  sem_prazo:    'bg-gray-200',
}

function ProgressDual({ exec, planejado }: { exec: number; planejado: number | null }) {
  return (
    <div className="relative w-full">
      {/* Barra de fundo (planejado) */}
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        {/* Barra real (exec) */}
        <div
          className="h-3 rounded-full bg-blue-500 transition-all relative"
          style={{ width: `${Math.min(exec, 100)}%` }}
        />
      </div>
      {/* Marcador do planejado */}
      {planejado !== null && (
        <div
          className="absolute top-0 h-3 w-0.5 bg-white/60 rounded"
          style={{ left: `${Math.min(planejado, 100)}%` }}
          title={`Planejado: ${planejado}%`}
        />
      )}
    </div>
  )
}

function KpiMini({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white/90 p-4 flex items-center gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

type Obra = { id: string; nome: string }

export default function PcpDashboardPage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [atividades, setAtividades] = useState<any[]>([])
  const [obraFiltro, setObraFiltro] = useState<string>('todas')
  const [statusFiltro, setStatusFiltro] = useState<string>('todos')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar(obra_id?: string) {
    setLoading(true)
    setErro('')
    try {
      const [obs, ativs] = await Promise.all([
        obrasApi.listar(),
        dashboardApi.pcp(obra_id === 'todas' ? undefined : obra_id),
      ])
      setObras(obs)
      setAtividades(ativs)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function trocarObra(id: string) {
    setObraFiltro(id)
    await carregar(id)
  }

  // Enriquece cada atividade com análise de desvio
  const atividadesComDesvio = useMemo(() =>
    atividades.map(a => ({ ...a, ...calcDesvio(a) }))
  , [atividades])

  // Filtro de status
  const atividadesFiltradas = useMemo(() =>
    statusFiltro === 'todos'
      ? atividadesComDesvio
      : atividadesComDesvio.filter(a => a.statusDesvio === statusFiltro)
  , [atividadesComDesvio, statusFiltro])

  // KPIs
  const kpis = useMemo(() => {
    const total     = atividadesComDesvio.length
    const conc      = atividadesComDesvio.filter(a => a.statusDesvio === 'concluida').length
    const atrasadas = atividadesComDesvio.filter(a => a.statusDesvio === 'atrasada').length
    const emRisco   = atividadesComDesvio.filter(a => a.statusDesvio === 'em_risco').length
    const adiant    = atividadesComDesvio.filter(a => a.statusDesvio === 'adiantada').length
    const noPrazo   = atividadesComDesvio.filter(a => a.statusDesvio === 'no_prazo').length
    const percMedioExec = total
      ? Math.round(atividadesComDesvio.reduce((s, a) => s + (a.percentual_exec || 0), 0) / total)
      : 0
    const comPrazo  = atividadesComDesvio.filter(a => a.planejado !== null && a.statusDesvio !== 'concluida')
    const percMedioPlan = comPrazo.length
      ? Math.round(comPrazo.reduce((s, a) => s + (a.planejado ?? 0), 0) / comPrazo.length)
      : null
    const desvioMedio = comPrazo.length
      ? Math.round(comPrazo.reduce((s, a) => s + (a.desvio ?? 0), 0) / comPrazo.length)
      : null
    return { total, conc, atrasadas, emRisco, adiant, noPrazo, percMedioExec, percMedioPlan, desvioMedio }
  }, [atividadesComDesvio])

  // Contagem por status para filtro
  const contPorStatus = useMemo(() => {
    const map: Record<string, number> = {}
    atividadesComDesvio.forEach(a => { map[a.statusDesvio] = (map[a.statusDesvio] || 0) + 1 })
    return map
  }, [atividadesComDesvio])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-400" />
            Dashboard PCP
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Análise de cronograma, desvios e atrasos por atividade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors">
            ← Dashboard Executivo
          </Link>
          <button
            onClick={() => carregar(obraFiltro)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-red-300 text-sm">
          Erro: {erro}
        </div>
      )}

      {/* Filtro de obra */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Building2 className="h-4 w-4" /> Obra:
        </div>
        <select
          value={obraFiltro}
          onChange={e => trocarObra(e.target.value)}
          className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="todas">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <span className="text-xs text-gray-400">
          {atividadesComDesvio.length} atividades
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini label="Concluídas"       value={kpis.conc}           icon={CheckCircle2}  color="bg-teal-600" />
        <KpiMini label="Atrasadas"        value={kpis.atrasadas}      icon={TrendingDown}  color={kpis.atrasadas > 0 ? 'bg-red-600' : 'bg-gray-200'} />
        <KpiMini label="Em Risco"         value={kpis.emRisco}        icon={AlertTriangle} color={kpis.emRisco > 0 ? 'bg-yellow-600' : 'bg-gray-200'} />
        <KpiMini label="Adiantadas"       value={kpis.adiant}         icon={TrendingUp}    color="bg-emerald-600" />
      </div>

      {/* Métricas de desvio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white/90 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">% Médio Executado</p>
          <p className="text-4xl font-bold text-blue-400">{kpis.percMedioExec}%</p>
          <p className="text-xs text-gray-400 mt-1">real / apontado</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white/90 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">% Médio Planejado</p>
          <p className="text-4xl font-bold text-gray-700">
            {kpis.percMedioPlan !== null ? `${kpis.percMedioPlan}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">baseado no cronograma</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white/90 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Desvio Médio</p>
          <div className="flex items-center justify-center gap-2">
            {kpis.desvioMedio !== null && (
              kpis.desvioMedio > 0
                ? <ArrowUpRight className="h-6 w-6 text-emerald-400" />
                : kpis.desvioMedio < 0
                ? <ArrowDownRight className="h-6 w-6 text-red-400" />
                : <Minus className="h-6 w-6 text-gray-500" />
            )}
            <p className={clsx('text-4xl font-bold',
              kpis.desvioMedio === null ? 'text-gray-400'
              : kpis.desvioMedio > 0   ? 'text-emerald-400'
              : kpis.desvioMedio < 0   ? 'text-red-400'
              : 'text-gray-700'
            )}>
              {kpis.desvioMedio !== null
                ? `${kpis.desvioMedio > 0 ? '+' : ''}${kpis.desvioMedio}%`
                : '—'}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-1">real − planejado</p>
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-500 shrink-0" />
        {(['todos', 'atrasada', 'em_risco', 'no_prazo', 'adiantada', 'concluida', 'nao_iniciada', 'sem_prazo'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFiltro(s)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium border transition-all',
              statusFiltro === s
                ? 'bg-blue-600 border-blue-500 text-white'
                : s === 'todos'
                ? 'border-gray-300 text-gray-500 hover:border-slate-500'
                : clsx(STATUS_COLOR[s as StatusDesvio], 'hover:opacity-80')
            )}
          >
            {s === 'todos' ? `Todos (${atividadesComDesvio.length})` : `${STATUS_LABEL[s as StatusDesvio]} (${contPorStatus[s] || 0})`}
          </button>
        ))}
      </div>

      {/* Tabela de atividades */}
      <div className="rounded-xl border border-gray-200 bg-white/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white/90">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-gray-500" />
            Atividades — {atividadesFiltradas.length} {statusFiltro !== 'todos' ? STATUS_LABEL[statusFiltro as StatusDesvio] : 'total'}
          </h2>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded bg-blue-500" /> Executado
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-0.5 h-2 bg-white/50" /> Planejado
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/80 text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Atividade</th>
                <th className="text-left px-4 py-3 font-medium">Empreiteiro</th>
                <th className="text-left px-4 py-3 font-medium">Prazo</th>
                <th className="text-left px-4 py-3 font-medium w-40">Progresso</th>
                <th className="text-center px-4 py-3 font-medium">Exec.</th>
                <th className="text-center px-4 py-3 font-medium">Plan.</th>
                <th className="text-center px-4 py-3 font-medium">Desvio</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {atividadesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {loading ? 'Carregando...' : 'Nenhuma atividade encontrada'}
                  </td>
                </tr>
              ) : atividadesFiltradas.map((a: any) => {
                const today = new Date().toISOString().split('T')[0]
                const diasFim = a.data_fim_prev
                  ? Math.round((new Date(a.data_fim_prev + 'T12:00:00').getTime() - Date.now()) / 86400000)
                  : null

                return (
                  <tr
                    key={a.id}
                    className={clsx(
                      'hover:bg-gray-100/30 transition-colors',
                      a.statusDesvio === 'atrasada' && 'bg-red-900/5',
                      a.statusDesvio === 'em_risco'  && 'bg-yellow-900/5',
                    )}
                  >
                    {/* Atividade */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-medium text-white text-sm truncate">{a.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {a.estrutura_obra?.nome && (
                          <span className="text-xs text-gray-400 truncate max-w-[120px]">
                            {a.estrutura_obra.nome}
                          </span>
                        )}
                        {a.prioridade && a.prioridade !== 'media' && (
                          <span className={clsx('text-xs font-medium capitalize', PRIORIDADE_COLOR[a.prioridade])}>
                            {a.prioridade}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Empreiteiro */}
                    <td className="px-4 py-3">
                      {a.empreiteiros?.razao_social ? (
                        <span className="flex items-center gap-1 text-xs text-gray-700">
                          <HardHat className="h-3 w-3 text-gray-400 shrink-0" />
                          {a.empreiteiros.razao_social}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>

                    {/* Prazo */}
                    <td className="px-4 py-3">
                      {a.data_fim_prev ? (
                        <div>
                          <p className="text-xs text-gray-500">
                            {new Date(a.data_fim_prev + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                          {a.statusDesvio !== 'concluida' && diasFim !== null && (
                            <p className={clsx('text-xs font-medium',
                              diasFim < 0 ? 'text-red-400' : diasFim < 7 ? 'text-yellow-400' : 'text-gray-400'
                            )}>
                              {diasFim < 0 ? `${Math.abs(diasFim)}d atrasado` : diasFim === 0 ? 'Hoje!' : `${diasFim}d`}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">Sem prazo</span>
                      )}
                    </td>

                    {/* Barra de progresso dual */}
                    <td className="px-4 py-3 min-w-[140px]">
                      <ProgressDual exec={a.percentual_exec || 0} planejado={a.planejado} />
                    </td>

                    {/* % Executado */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-medium text-sm">{a.percentual_exec || 0}%</span>
                    </td>

                    {/* % Planejado */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-500 text-sm">
                        {a.planejado !== null ? `${a.planejado}%` : '—'}
                      </span>
                    </td>

                    {/* Desvio */}
                    <td className="px-4 py-3 text-center">
                      {a.desvio !== null ? (
                        <span className={clsx('font-bold text-sm flex items-center justify-center gap-0.5',
                          a.desvio > 0 ? 'text-emerald-400' : a.desvio < 0 ? 'text-red-400' : 'text-gray-500'
                        )}>
                          {a.desvio > 0 ? <ArrowUpRight className="h-3.5 w-3.5" />
                            : a.desvio < 0 ? <ArrowDownRight className="h-3.5 w-3.5" />
                            : <Minus className="h-3.5 w-3.5" />}
                          {a.desvio > 0 ? '+' : ''}{a.desvio}%
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>

                    {/* Badge status */}
                    <td className="px-4 py-3 text-center">
                      <span className={clsx(
                        'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                        STATUS_COLOR[a.statusDesvio as StatusDesvio]
                      )}>
                        {STATUS_LABEL[a.statusDesvio as StatusDesvio]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé: resumo */}
        {atividadesFiltradas.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-white/90">
            <div className="flex gap-4 text-xs">
              {(['atrasada', 'em_risco', 'no_prazo', 'adiantada', 'concluida'] as StatusDesvio[]).map(s => (
                contPorStatus[s] > 0 && (
                  <button
                    key={s}
                    onClick={() => setStatusFiltro(s)}
                    className={clsx('flex items-center gap-1 rounded-full border px-2 py-0.5 transition-all hover:opacity-80', STATUS_COLOR[s])}
                  >
                    {STATUS_LABEL[s]}: <strong>{contPorStatus[s]}</strong>
                  </button>
                )
              ))}
            </div>
            <Link href="/pcp" className="text-xs text-blue-400 hover:text-blue-300">
              Gerenciar PCP →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
