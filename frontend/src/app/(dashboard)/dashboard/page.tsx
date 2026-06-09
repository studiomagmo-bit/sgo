'use client'
import { useEffect, useState } from 'react'
import { dashboard as dashboardApi } from '@/lib/sgoApi'
import {
  Building2, Users, AlertTriangle, CheckCircle, TrendingUp,
  Clock, XCircle, Loader2, HardHat, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, CalendarDays, GitBranch,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

// ── Helpers ────────────────────────────────────────────────────
const STATUS_OBRA_LABEL: Record<string, string> = {
  planejamento: 'Planejamento', em_andamento: 'Em andamento',
  pausada: 'Pausada', concluida: 'Concluída', cancelada: 'Cancelada',
}
const STATUS_OBRA_COLOR: Record<string, string> = {
  planejamento: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
  em_andamento: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  pausada: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
  concluida: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  cancelada: 'bg-red-900/40 text-red-300 border-red-700/40',
}
function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function diasRestantes(dataFim?: string) {
  if (!dataFim) return null
  const diff = Math.round((new Date(dataFim).getTime() - Date.now()) / 86400000)
  return diff
}

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({ title, value, icon: Icon, color, sub, href, trend }: any) {
  const card = (
    <div className={clsx('rounded-xl border border-slate-700 bg-slate-800/60 p-4 flex items-start gap-3 hover:bg-slate-800 transition-colors', href && 'cursor-pointer')}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={clsx('flex items-center gap-0.5 text-xs font-medium',
          trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-slate-400')}>
          {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : trend < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
  return href ? <Link href={href}>{card}</Link> : card
}

// ── Barra de progresso ─────────────────────────────────────────
function ProgressBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    dashboardApi.executivo()
      .then(setData)
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }
  if (erro) {
    return (
      <div className="rounded-xl border border-red-700 bg-red-900/20 p-6 text-red-300 text-sm">
        Erro ao carregar dashboard: {erro}
      </div>
    )
  }

  const { obras, atividades, pendencias, inspecoes, efetivosHoje, empreiteiros, medicoes } = data

  // ── Cálculos ────────────────────────────────────────────────
  const obrasAtivas      = obras.filter((o: any) => o.status === 'em_andamento')
  const obrasConcluidas  = obras.filter((o: any) => o.status === 'concluida')
  const obrasPlanejas    = obras.filter((o: any) => o.status === 'planejamento')

  const hoje = new Date().toISOString().split('T')[0]
  const atividadesAtrasadas = atividades.filter((a: any) =>
    a.status !== 'concluida' && a.status !== 'cancelada' &&
    a.data_fim_prev && a.data_fim_prev < hoje
  )
  const atividadesConcluidas  = atividades.filter((a: any) => a.status === 'concluida')
  const atividadesAndamento   = atividades.filter((a: any) => a.status === 'em_andamento')
  const atividadesCriticas    = atividades.filter((a: any) => a.prioridade === 'critica' && a.status !== 'concluida')

  const percMedio = atividades.length
    ? Math.round(atividades.reduce((s: number, a: any) => s + (a.percentual_exec || 0), 0) / atividades.length)
    : 0

  const pendenciasAbertas = pendencias.length
  const inspecoesPendentes = inspecoes.filter((i: any) => i.status === 'aguardando').length
  const inspecoesAprovadas = inspecoes.filter((i: any) => i.status === 'aprovada').length

  const valorMedicoes = medicoes
    .filter((m: any) => m.status === 'aprovada' || m.status === 'paga')
    .reduce((s: number, m: any) => s + (m.valor_total || 0), 0)

  // ── Obras + dados por obra ───────────────────────────────────
  const obrasEnriquecidas = obras.map((o: any) => ({
    ...o,
    qtdAtividades:    atividades.filter((a: any) => a.obra_id === o.id).length,
    atividadesAt:     atividades.filter((a: any) => a.obra_id === o.id && a.status === 'em_andamento').length,
    atividadesConc:   atividades.filter((a: any) => a.obra_id === o.id && a.status === 'concluida').length,
    pendenciasObra:   pendencias.filter((p: any) => p.obra_id === o.id).length,
    inspecoesObra:    inspecoes.filter((i: any) => i.obra_id === o.id && i.status === 'aguardando').length,
    efetivosObra:     efetivosHoje.filter((e: any) => e.obra_id === o.id).length,
    diasRestantes:    diasRestantes(o.data_fim_prev),
    percAtividades:   (() => {
      const ats = atividades.filter((a: any) => a.obra_id === o.id)
      return ats.length ? Math.round(ats.reduce((s: number, a: any) => s + (a.percentual_exec || 0), 0) / ats.length) : (o.percentual_geral || 0)
    })(),
  }))

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Executivo</h1>
          <p className="text-slate-400 text-sm mt-1 capitalize">{today}</p>
        </div>
        <Link
          href="/pcp-dashboard"
          className="flex items-center gap-2 rounded-lg border border-blue-700/50 bg-blue-900/20 px-4 py-2 text-sm text-blue-300 hover:bg-blue-900/40 transition-colors"
        >
          <BarChart3 className="h-4 w-4" /> Dashboard PCP
        </Link>
      </div>

      {/* KPIs principais — linha 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Obras Ativas"     value={fmt(obrasAtivas.length)}       icon={Building2}     color="bg-blue-600"     sub={`${obras.length} total`}            href="/obras" />
        <KpiCard title="Empreiteiros"     value={fmt(empreiteiros.length)}       icon={HardHat}       color="bg-indigo-600"   sub="ativos"                             href="/empreiteiros" />
        <KpiCard title="Efetivo Hoje"     value={fmt(efetivosHoje.length)}       icon={Users}         color="bg-emerald-600"  sub="registros do dia" />
        <KpiCard title="Medições Aprov."  value={fmtBRL(valorMedicoes)}          icon={DollarSign}    color="bg-violet-600"   sub="valor aprovado/pago"                href="/medicoes" />
      </div>

      {/* KPIs PCP — linha 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="% Médio Exec."    value={`${percMedio}%`}                icon={TrendingUp}    color="bg-cyan-600"     sub={`${atividades.length} atividades`} href="/pcp-dashboard" />
        <KpiCard title="Atividades Conc." value={fmt(atividadesConcluidas.length)} icon={CheckCircle} color="bg-teal-600"     sub={`${atividadesAndamento.length} em andamento`} href="/pcp" />
        <KpiCard title="Ativid. Atrasadas" value={fmt(atividadesAtrasadas.length)} icon={Clock}       color={atividadesAtrasadas.length > 0 ? 'bg-red-600' : 'bg-slate-600'}   sub="fora do prazo"    href="/pcp" />
        <KpiCard title="Prioridade Crítica" value={fmt(atividadesCriticas.length)} icon={AlertTriangle} color={atividadesCriticas.length > 0 ? 'bg-orange-600' : 'bg-slate-600'} sub="atividades críticas" href="/pcp" />
      </div>

      {/* KPIs Qualidade — linha 3 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Pendências Ab."   value={fmt(pendenciasAbertas)}         icon={XCircle}       color={pendenciasAbertas > 0 ? 'bg-red-700' : 'bg-slate-600'}  sub="abertas/em correção" href="/pendencias" />
        <KpiCard title="Inspeç. Pending." value={fmt(inspecoesPendentes)}        icon={Clock}         color={inspecoesPendentes > 0 ? 'bg-yellow-600' : 'bg-slate-600'} sub="aguardando"         href="/inspecoes" />
        <KpiCard title="Inspeç. Aprov."   value={fmt(inspecoesAprovadas)}        icon={CheckCircle}   color="bg-green-600"    sub="aprovadas"                          href="/inspecoes" />
        <KpiCard title="Obras Planej."    value={fmt(obrasPlanejas.length)}      icon={CalendarDays}  color="bg-amber-600"    sub="em planejamento"                    href="/obras" />
      </div>

      {/* Status por categoria */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Obras por status */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />Obras por Status
          </h3>
          <div className="space-y-2">
            {(['em_andamento', 'planejamento', 'concluida', 'pausada'] as const).map(s => {
              const count = obras.filter((o: any) => o.status === s).length
              const pct   = obras.length ? Math.round((count / obras.length) * 100) : 0
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{STATUS_OBRA_LABEL[s]}</span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                  <ProgressBar value={pct} color={
                    s === 'em_andamento' ? 'bg-blue-500' :
                    s === 'planejamento' ? 'bg-yellow-500' :
                    s === 'concluida'    ? 'bg-emerald-500' : 'bg-slate-500'
                  } />
                </div>
              )
            })}
          </div>
        </div>

        {/* Atividades por status */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-slate-400" />PCP por Status
          </h3>
          <div className="space-y-2">
            {(['concluida', 'em_andamento', 'planejada', 'bloqueada'] as const).map(s => {
              const count = atividades.filter((a: any) => a.status === s).length
              const pct   = atividades.length ? Math.round((count / atividades.length) * 100) : 0
              const colors: Record<string, string> = {
                concluida: 'bg-emerald-500', em_andamento: 'bg-blue-500',
                planejada: 'bg-slate-500', bloqueada: 'bg-red-500',
              }
              const labels: Record<string, string> = {
                concluida: 'Concluída', em_andamento: 'Em andamento',
                planejada: 'Planejada', bloqueada: 'Bloqueada',
              }
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{labels[s]}</span>
                    <span className="text-white font-medium">{count} ({pct}%)</span>
                  </div>
                  <ProgressBar value={pct} color={colors[s]} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Atividades atrasadas por prioridade */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-slate-400" />Alertas
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Atividades atrasadas', value: atividadesAtrasadas.length, color: 'text-red-400', href: '/pcp' },
              { label: 'Prioridade crítica',   value: atividadesCriticas.length,  color: 'text-orange-400', href: '/pcp' },
              { label: 'Pendências abertas',   value: pendenciasAbertas,          color: 'text-yellow-400', href: '/pendencias' },
              { label: 'Inspeções pendentes',  value: inspecoesPendentes,         color: 'text-blue-400', href: '/inspecoes' },
            ].map(item => (
              <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-lg hover:bg-slate-700/40 px-2 py-1.5 transition-colors">
                <span className="text-xs text-slate-400">{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de obras */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="font-semibold text-white">Obras</h2>
          <Link href="/obras" className="text-xs text-blue-400 hover:text-blue-300">Ver todas →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                {['Obra', 'Status', 'Progresso', 'Atividades', 'Pendências', 'Efetivo Hoje', 'Prazo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {obrasEnriquecidas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma obra ativa cadastrada
                  </td>
                </tr>
              ) : obrasEnriquecidas.map((o: any) => {
                const dr = o.diasRestantes
                const prazoColor = dr === null ? 'text-slate-500'
                  : dr < 0  ? 'text-red-400'
                  : dr < 15 ? 'text-yellow-400'
                  : 'text-emerald-400'
                return (
                  <tr key={o.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/obras/detail?id=${o.id}`} className="font-medium text-blue-400 hover:text-blue-300 hover:underline">
                        {o.nome}
                      </Link>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{o.tipo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_OBRA_COLOR[o.status] || 'bg-slate-700 text-slate-300 border-slate-600')}>
                        {STATUS_OBRA_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={o.percAtividades} color={
                          o.percAtividades >= 80 ? 'bg-emerald-500' :
                          o.percAtividades >= 40 ? 'bg-blue-500' : 'bg-yellow-500'
                        } />
                        <span className="text-xs text-slate-300 shrink-0">{o.percAtividades}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white text-sm">{o.atividadesConc}</span>
                      <span className="text-slate-500 text-xs">/{o.qtdAtividades}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.pendenciasObra > 0 ? (
                        <span className="rounded-full bg-red-900/40 border border-red-700/40 px-2 py-0.5 text-xs text-red-300">
                          {o.pendenciasObra}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-900/30 border border-emerald-700/30 px-2 py-0.5 text-xs text-emerald-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.efetivosObra > 0 ? (
                        <span className="text-emerald-400 text-sm font-medium">{o.efetivosObra}</span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {o.data_fim_prev ? (
                        <div>
                          <p className="text-xs text-slate-400">{new Date(o.data_fim_prev + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          <p className={clsx('text-xs font-medium', prazoColor)}>
                            {dr === null ? '—' : dr < 0 ? `${Math.abs(dr)}d atrasado` : dr === 0 ? 'Hoje!' : `${dr}d restantes`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
