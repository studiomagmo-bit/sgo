'use client'
import { useEffect, useState } from 'react'
import { dashboard as dashboardApi, obras as obrasApi } from '@/lib/sgoApi'
import { useAuth } from '@/contexts/auth'
import {
  Building2, Users, GitBranch, CheckCircle2, AlertTriangle,
  Clock, TrendingUp, DollarSign, HardHat, Loader2,
  ArrowRight, CalendarDays, BarChart3, Activity,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

// ── Helpers ────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function diasRestantes(dataFim?: string) {
  if (!dataFim) return null
  return Math.round((new Date(dataFim + 'T12:00:00').getTime() - Date.now()) / 86400000)
}

const STATUS_LABEL: Record<string, string> = {
  planejamento: 'Planejamento', em_andamento: 'Em andamento',
  pausada: 'Pausada', concluida: 'Concluída', cancelada: 'Cancelada',
}
const STATUS_DOT: Record<string, string> = {
  planejamento: 'bg-amber-400', em_andamento: 'bg-blue-500',
  pausada: 'bg-gray-400', concluida: 'bg-emerald-500', cancelada: 'bg-red-400',
}
const STATUS_ROW: Record<string, string> = {
  planejamento: 'border-amber-200 bg-amber-50/50',
  em_andamento: 'border-blue-200 bg-blue-50/30',
  pausada: 'border-gray-200',
  concluida: 'border-emerald-200 bg-emerald-50/30',
  cancelada: 'border-red-200 bg-red-50/30',
}

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({
  title, value, icon: Icon, iconBg, iconColor, sub, href, trend, alert
}: {
  title: string; value: string | number; icon: any; iconBg: string; iconColor: string
  sub?: string; href?: string; trend?: number; alert?: boolean
}) {
  const content = (
    <div className={clsx(
      'group rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200',
      alert ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
    )}>
      <div className="flex items-start justify-between">
        <div className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', iconBg)}>
          <Icon className={clsx('h-5 w-5', iconColor)} />
        </div>
        {href && (
          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-1" />
        )}
      </div>
      <div className="mt-4">
        <p className={clsx('text-2xl font-bold', alert && Number(value) > 0 ? 'text-red-600' : 'text-gray-900')}>{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{title}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

// ── Barra de progresso ─────────────────────────────────────────
function ProgressBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.executivo()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const hoje = new Date().toISOString().split('T')[0]
  const diaSemana = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataFmt   = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Carregando dashboard...</p>
      </div>
    </div>
  )

  if (!data) return null

  const { obras, atividades, pendencias, inspecoes, efetivosHoje, empreiteiros, medicoes } = data

  // Cálculos
  const obrasAtivas     = obras.filter((o: any) => o.status === 'em_andamento').length
  const atividadesAtras = atividades.filter((a: any) =>
    a.status !== 'concluida' && a.status !== 'cancelada' &&
    a.data_fim_prev && a.data_fim_prev < hoje
  ).length
  const atividadesConc  = atividades.filter((a: any) => a.status === 'concluida').length
  const percMedio       = atividades.length
    ? Math.round(atividades.reduce((s: number, a: any) => s + (a.percentual_exec || 0), 0) / atividades.length)
    : 0
  const pendAbertas     = pendencias.length
  const inspecPend      = inspecoes.filter((i: any) => i.status === 'aguardando').length
  const valorMed        = medicoes.filter((m: any) => ['aprovada', 'paga'].includes(m.status))
    .reduce((s: number, m: any) => s + (m.valor_total || 0), 0)
  const criticas        = atividades.filter((a: any) => a.prioridade === 'critica' && a.status !== 'concluida').length

  const obrasEnrich = obras.map((o: any) => {
    const ats    = atividades.filter((a: any) => a.obra_id === o.id)
    const conc   = ats.filter((a: any) => a.status === 'concluida').length
    const perc   = ats.length ? Math.round(ats.reduce((s: number, a: any) => s + (a.percentual_exec || 0), 0) / ats.length) : (o.percentual_geral || 0)
    const pends  = pendencias.filter((p: any) => p.obra_id === o.id).length
    const efetivoHj = efetivosHoje.filter((e: any) => e.obra_id === o.id).length
    const dr     = diasRestantes(o.data_fim_prev)
    return { ...o, ats: ats.length, conc, perc, pends, efetivoHj, dr }
  })

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold capitalize">
              Olá, {user?.nome?.split(' ')[0] || 'Gestor'} 👋
            </h1>
            <p className="text-blue-100 text-sm mt-1 capitalize">
              {diaSemana}, {dataFmt}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2.5 text-sm font-medium">
              <Activity className="h-4 w-4" />
              <span>{obrasAtivas} obras em andamento</span>
            </div>
            <Link
              href="/pcp-dashboard"
              className="flex items-center gap-2 bg-white text-blue-700 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard PCP
            </Link>
          </div>
        </div>

        {/* Mini stats no header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Obras Ativas',    value: obrasAtivas,           sub: `${obras.length} total` },
            { label: 'Efetivo Hoje',    value: efetivosHoje.length,   sub: 'registros do dia' },
            { label: 'Execução Média',  value: `${percMedio}%`,       sub: `${atividades.length} atividades` },
            { label: 'Medições Aprov.', value: fmtBRL(valorMed),      sub: 'valor aprovado/pago' },
          ].map(s => (
            <div key={s.label} className="bg-white/15 rounded-xl px-4 py-3">
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-blue-100 mt-0.5">{s.label}</p>
              <p className="text-[10px] text-blue-200/70 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Atividades Concluídas" value={fmt(atividadesConc)}
          icon={CheckCircle2} iconBg="bg-emerald-100" iconColor="text-emerald-600"
          sub={`de ${atividades.length} total`} href="/pcp"
        />
        <KpiCard
          title="Atrasadas" value={fmt(atividadesAtras)}
          icon={Clock} iconBg="bg-red-100" iconColor="text-red-600"
          sub="fora do prazo" href="/pcp" alert={atividadesAtras > 0}
        />
        <KpiCard
          title="Pendências Abertas" value={fmt(pendAbertas)}
          icon={AlertTriangle} iconBg="bg-amber-100" iconColor="text-amber-600"
          sub="aguardando resolução" href="/pendencias" alert={pendAbertas > 0}
        />
        <KpiCard
          title="Inspeções Pendentes" value={fmt(inspecPend)}
          icon={CheckCircle2} iconBg="bg-blue-100" iconColor="text-blue-600"
          sub="aguardando aprovação" href="/inspecoes"
        />
      </div>

      {/* ── Linha principal ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Obras por status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Obras por Status</h3>
            <Link href="/obras" className="text-xs text-blue-600 hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-3">
            {([
              ['em_andamento', 'Em andamento', 'bg-blue-500'],
              ['planejamento',  'Planejamento', 'bg-amber-400'],
              ['concluida',     'Concluída',    'bg-emerald-500'],
              ['pausada',       'Pausada',      'bg-gray-400'],
            ] as const).map(([key, label, color]) => {
              const count = obras.filter((o: any) => o.status === key).length
              const pct   = obras.length ? (count / obras.length) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
                      <span className="text-gray-600">{label}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{count}</span>
                  </div>
                  <ProgressBar value={pct} color={color} />
                </div>
              )
            })}
          </div>
          {obras.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Sem obras visíveis</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Execute <strong>database/11_fix_gestors_e_usuarios.sql</strong> no Supabase SQL Editor para corrigir seu acesso como Gestor.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PCP por status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">PCP — Atividades</h3>
            <Link href="/pcp-dashboard" className="text-xs text-blue-600 hover:underline">Detalhes →</Link>
          </div>
          <div className="space-y-3">
            {([
              ['concluida',    'Concluída',     'bg-emerald-500'],
              ['em_andamento', 'Em andamento',  'bg-blue-500'],
              ['planejada',    'Planejada',     'bg-gray-300'],
              ['bloqueada',    'Bloqueada',     'bg-red-400'],
            ] as const).map(([key, label, color]) => {
              const count = atividades.filter((a: any) => a.status === key).length
              const pct   = atividades.length ? (count / atividades.length) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
                      <span className="text-gray-600">{label}</span>
                    </div>
                    <span className="font-semibold text-gray-800">
                      {count}
                      {atividades.length > 0 && <span className="text-gray-400 font-normal ml-1">({Math.round(pct)}%)</span>}
                    </span>
                  </div>
                  <ProgressBar value={pct} color={color} />
                </div>
              )
            })}
          </div>
          {atividades.length === 0 && (
            <p className="text-gray-400 text-xs text-center mt-4">Nenhuma atividade cadastrada</p>
          )}
        </div>

        {/* Alertas + empreiteiros */}
        <div className="space-y-4">
          {/* Alertas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Alertas</h3>
            <div className="space-y-2">
              {[
                { label: 'Atividades atrasadas', value: atividadesAtras, href: '/pcp',       color: 'text-red-600',    bg: 'bg-red-50',    icon: Clock },
                { label: 'Prioridade crítica',   value: criticas,         href: '/pcp',       color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
                { label: 'Pendências abertas',   value: pendAbertas,      href: '/pendencias', color: 'text-amber-600', bg: 'bg-amber-50',  icon: AlertTriangle },
                { label: 'Inspeções pendentes',  value: inspecPend,       href: '/inspecoes',  color: 'text-blue-600',  bg: 'bg-blue-50',   icon: CheckCircle2 },
              ].map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={clsx(
                    'flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:opacity-90',
                    item.value > 0 ? item.bg : 'bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className={clsx('h-3.5 w-3.5', item.value > 0 ? item.color : 'text-gray-400')} />
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                  <span className={clsx('text-sm font-bold', item.value > 0 ? item.color : 'text-gray-400')}>
                    {item.value}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Resumo rápido */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Resumo Geral</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Empreiteiros ativos',  value: empreiteiros.length, href: '/empreiteiros', icon: HardHat },
                { label: 'Inspecões aprovadas',  value: inspecoes.filter((i: any) => i.status === 'aprovada').length, href: '/inspecoes', icon: CheckCircle2 },
                { label: 'Obras concluídas',     value: obras.filter((o: any) => o.status === 'concluida').length, href: '/obras', icon: Building2 },
              ].map(r => (
                <Link key={r.label} href={r.href} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 hover:text-blue-600 transition-colors">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <r.icon className="h-3.5 w-3.5" />
                    {r.label}
                  </div>
                  <span className="font-semibold text-gray-800">{r.value}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabela de obras ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            Obras Ativas
          </h2>
          <Link href="/obras" className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {obrasEnrich.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Building2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">Nenhuma obra cadastrada ainda</p>
            <p className="text-gray-300 text-xs mt-1">Vá em <strong className="text-gray-400">Obras → Nova Obra</strong> para começar</p>
            <Link href="/obras/nova" className="inline-flex items-center gap-2 mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              <Building2 className="h-4 w-4" /> Criar primeira obra
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                  {['Obra', 'Status', 'Progresso', 'Atividades', 'Pendências', 'Prazo'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {obrasEnrich.map((o: any) => (
                  <tr key={o.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/obras/detail?id=${o.id}`} className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                        {o.nome}
                      </Link>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{o.tipo}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border', {
                        'bg-blue-50 text-blue-700 border-blue-200':    o.status === 'em_andamento',
                        'bg-amber-50 text-amber-700 border-amber-200':  o.status === 'planejamento',
                        'bg-emerald-50 text-emerald-700 border-emerald-200': o.status === 'concluida',
                        'bg-gray-50 text-gray-500 border-gray-200':    o.status === 'pausada',
                        'bg-red-50 text-red-600 border-red-200':       o.status === 'cancelada',
                      })}>
                        <span className={clsx('inline-block w-1.5 h-1.5 rounded-full', STATUS_DOT[o.status])} />
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={clsx('h-2 rounded-full', o.perc >= 80 ? 'bg-emerald-500' : o.perc >= 40 ? 'bg-blue-500' : 'bg-amber-400')}
                            style={{ width: `${o.perc}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-9 shrink-0 text-right">{o.perc}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-gray-800 font-medium">{o.conc}</span>
                      <span className="text-gray-400">/{o.ats}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {o.pends > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">{o.pends}</span>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {o.data_fim_prev ? (
                        <div>
                          <p className="text-xs text-gray-500">{new Date(o.data_fim_prev + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          <p className={clsx('text-xs font-semibold mt-0.5', o.dr === null ? '' : o.dr < 0 ? 'text-red-500' : o.dr < 15 ? 'text-amber-500' : 'text-emerald-600')}>
                            {o.dr === null ? '' : o.dr < 0 ? `${Math.abs(o.dr)}d atrasado` : o.dr === 0 ? '⚠️ Hoje!' : `${o.dr}d restantes`}
                          </p>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
