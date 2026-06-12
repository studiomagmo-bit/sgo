'use client'
import { useEffect, useState } from 'react'
import { dashboard as dashboardApi } from '@/lib/sgoApi'
import { useAuth } from '@/contexts/auth'
import {
  Building2, CheckCircle2, AlertTriangle, Clock, HardHat,
  Loader2, ArrowRight, BarChart3, Activity, Users,
  GitBranch, TrendingDown, Flag, Play,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) }
function diasRestantes(d?: string) { return d ? Math.round((new Date(d + 'T12:00:00').getTime() - Date.now()) / 86400000) : null }

const STATUS_DOT: Record<string, string> = {
  planejamento: 'bg-amber-400', em_andamento: 'bg-blue-400',
  pausada: 'bg-gray-400', concluida: 'bg-emerald-400', cancelada: 'bg-red-400',
}
const STATUS_LABEL: Record<string, string> = {
  planejamento: 'Planejamento', em_andamento: 'Em andamento',
  pausada: 'Pausada', concluida: 'Concluída', cancelada: 'Cancelada',
}

function ProgressBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

// ── Dashboard do Gestor ──────────────────────────────────────
function DashGestor({ data, user }: { data: any; user: any }) {
  const { obras, atividades, pendencias, inspecoes, empreiteiros, medicoes, efetivosHoje } = data
  const hoje = new Date().toISOString().split('T')[0]

  const obrasAtivas    = obras.filter((o: any) => o.status === 'em_andamento').length
  const atividAtras    = atividades.filter((a: any) => a.status !== 'concluida' && a.status !== 'cancelada' && a.data_fim_prev && a.data_fim_prev < hoje).length
  const atividConc     = atividades.filter((a: any) => a.status === 'concluida').length
  const percMedio      = atividades.length ? Math.round(atividades.reduce((s: number, a: any) => s + (a.percentual_exec || 0), 0) / atividades.length) : 0
  const pendAbertas    = pendencias.length
  const inspecPend     = inspecoes.filter((i: any) => i.status === 'aguardando').length
  const pendValidacao  = atividades.filter((a: any) => a.status === 'pendente_validacao').length
  const valorMed       = medicoes.filter((m: any) => ['aprovada', 'paga'].includes(m.status)).reduce((s: number, m: any) => s + (m.valor_liquido || 0), 0)
  const criticas       = atividades.filter((a: any) => a.prioridade === 'critica' && a.status !== 'concluida').length
  const impedidas      = atividades.filter((a: any) => a.status === 'impedida').length

  const diaSemana = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataFmt   = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  const obrasEnrich = obras.map((o: any) => {
    const ats  = atividades.filter((a: any) => a.obra_id === o.id)
    const conc = ats.filter((a: any) => a.status === 'concluida').length
    const perc = ats.length ? Math.round(ats.reduce((s: number, a: any) => s + (a.percentual_exec || 0), 0) / ats.length) : (o.percentual_geral || 0)
    const dr   = diasRestantes(o.data_fim_prev)
    const pend = pendencias.filter((p: any) => p.obra_id === o.id).length
    const valid= atividades.filter((a: any) => a.obra_id === o.id && a.status === 'pendente_validacao').length
    return { ...o, ats: ats.length, conc, perc, dr, pend, valid }
  })

  return (
    <div className="space-y-6 w-full">
      {/* Header azul */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Olá, {user?.nome?.split(' ')[0]} 👋</h1>
            <p className="text-blue-100 text-sm mt-1 capitalize">{diaSemana}, {dataFmt}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2.5 text-sm font-medium text-white">
              <Activity className="h-4 w-4" />{obrasAtivas} em andamento
            </div>
            <Link href="/pcp-dashboard" className="flex items-center gap-2 bg-white text-blue-700 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 shadow-sm">
              <BarChart3 className="h-4 w-4" /> Dashboard PCP
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Obras Ativas',    value: obrasAtivas,         sub: `${obras.length} total` },
            { label: 'Efetivo Hoje',    value: efetivosHoje.length, sub: 'registros' },
            { label: 'Execução Média',  value: `${percMedio}%`,     sub: `${atividades.length} atividades` },
            { label: 'Medições Aprov.', value: fmtBRL(valorMed),    sub: 'aprovado/pago' },
          ].map(s => (
            <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-blue-100 mt-0.5 font-medium">{s.label}</p>
              <p className="text-[10px] text-blue-200/80">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas principais — ações pendentes */}
      {(pendValidacao > 0 || impedidas > 0 || atividAtras > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pendValidacao > 0 && (
            <Link href="/producoes" className="flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Flag className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{pendValidacao}</p>
                <p className="text-xs text-amber-600 font-medium">Aguardando validação</p>
                <p className="text-[10px] text-amber-500">→ Clique para validar</p>
              </div>
            </Link>
          )}
          {impedidas > 0 && (
            <Link href="/pcp" className="flex items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{impedidas}</p>
                <p className="text-xs text-red-600 font-medium">Atividades impedidas</p>
                <p className="text-[10px] text-red-500">Requer atenção imediata</p>
              </div>
            </Link>
          )}
          {atividAtras > 0 && (
            <Link href="/pcp-dashboard" className="flex items-center gap-3 rounded-2xl border-2 border-orange-300 bg-orange-50 px-5 py-4 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{atividAtras}</p>
                <p className="text-xs text-orange-600 font-medium">Atividades atrasadas</p>
                <p className="text-[10px] text-orange-500">Fora do prazo</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Concluídas', value: atividConc, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50', sub: `de ${atividades.length}`, href: '/pcp' },
          { label: 'Pendências', value: pendAbertas, icon: AlertTriangle, color: pendAbertas > 0 ? 'text-amber-600' : 'text-gray-400', bg: pendAbertas > 0 ? 'bg-amber-50' : 'bg-gray-50', href: '/pendencias' },
          { label: 'Insp. Pend.', value: inspecPend, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', href: '/inspecoes' },
          { label: 'Empreiteiros', value: empreiteiros.length, icon: HardHat, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/empreiteiros' },
        ].map(k => (
          <Link key={k.label} href={k.href} className={`rounded-2xl border border-transparent ${k.bg} p-5 flex items-center gap-3 hover:shadow-md transition-all`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
              {k.sub && <p className="text-[10px] text-gray-400">{k.sub}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* Tabela de obras */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" /> Obras
          </h2>
          <Link href="/obras" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {obrasEnrich.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Building2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhuma obra cadastrada</p>
            <Link href="/obras/nova" className="inline-flex items-center gap-2 mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Building2 className="h-4 w-4" /> Criar primeira obra
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <tr>{['Obra','Status','Progresso','Atividades','Validações','Prazo'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {obrasEnrich.map((o: any) => (
                  <tr key={o.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/obras/detail?id=${o.id}`} className="font-semibold text-blue-600 hover:underline">{o.nome}</Link>
                      <p className="text-xs text-gray-400 capitalize">{o.tipo}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border', {
                        'bg-blue-50 text-blue-700 border-blue-200':      o.status === 'em_andamento',
                        'bg-amber-50 text-amber-700 border-amber-200':   o.status === 'planejamento',
                        'bg-emerald-50 text-emerald-700 border-emerald-200': o.status === 'concluida',
                        'bg-gray-50 text-gray-500 border-gray-200':      true,
                      })}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[o.status]}`} />
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className={clsx('h-2 rounded-full', o.perc >= 80 ? 'bg-emerald-500' : o.perc >= 40 ? 'bg-blue-500' : 'bg-amber-400')}
                            style={{ width: `${o.perc}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-9 text-right">{o.perc}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-medium text-gray-800">{o.conc}</span><span className="text-gray-400">/{o.ats}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {o.valid > 0
                        ? <Link href="/producoes"><span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs font-semibold">
                          <Flag className="h-3 w-3" />{o.valid}
                        </span></Link>
                        : <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />}
                    </td>
                    <td className="px-5 py-3.5">
                      {o.data_fim_prev ? (
                        <div>
                          <p className="text-xs text-gray-500">{new Date(o.data_fim_prev + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          {o.dr !== null && <p className={clsx('text-xs font-semibold', o.dr < 0 ? 'text-red-500' : o.dr < 15 ? 'text-amber-500' : 'text-emerald-600')}>
                            {o.dr < 0 ? `${Math.abs(o.dr)}d atrasado` : o.dr === 0 ? '⚠️ Hoje!' : `${o.dr}d`}
                          </p>}
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

      {/* Painéis inferiores: PCP + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">PCP — Status</h3>
            <Link href="/pcp-dashboard" className="text-xs text-blue-500 hover:underline">Detalhes →</Link>
          </div>
          {[
            ['concluida','Concluída','bg-teal-500'],['em_andamento','Em andamento','bg-blue-500'],
            ['impedida','Impedida','bg-red-400'],['pendente_validacao','Pend. validação','bg-amber-400'],
            ['planejada','Planejada','bg-gray-300'],
          ].map(([k,label,color]) => {
            const count = atividades.filter((a: any) => a.status === k).length
            const pct = atividades.length ? (count / atividades.length) * 100 : 0
            return (
              <div key={k} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-gray-600"><span className={`w-2 h-2 rounded-full ${color}`} />{label}</span>
                  <span className="font-semibold text-gray-800">{count}</span>
                </div>
                <ProgressBar value={pct} color={color} />
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Alertas</h3>
          <div className="space-y-2">
            {[
              { label: 'Validações pendentes', value: pendValidacao, href: '/producoes', color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Atividades impedidas', value: impedidas, href: '/pcp', color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Atrasadas', value: atividAtras, href: '/pcp-dashboard', color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Prioridade crítica', value: criticas, href: '/pcp', color: 'text-red-700', bg: 'bg-red-50' },
              { label: 'Pendências abertas', value: pendAbertas, href: '/pendencias', color: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Inspeções pendentes', value: inspecPend, href: '/inspecoes', color: 'text-blue-600', bg: 'bg-blue-50' },
            ].map(item => (
              <Link key={item.label} href={item.href} className={clsx('flex items-center justify-between rounded-xl px-3 py-2.5 hover:opacity-90 transition-all', item.value > 0 ? item.bg : 'bg-gray-50')}>
                <span className="text-xs text-gray-600">{item.label}</span>
                <span className={clsx('text-sm font-bold', item.value > 0 ? item.color : 'text-gray-400')}>{item.value}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Resumo</h3>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Empreiteiros ativos', value: empreiteiros.length, href: '/empreiteiros', icon: HardHat },
              { label: 'Obras concluídas', value: obras.filter((o: any) => o.status === 'concluida').length, href: '/obras', icon: Building2 },
              { label: 'Insp. aprovadas', value: inspecoes.filter((i: any) => i.status === 'aprovada').length, href: '/inspecoes', icon: CheckCircle2 },
            ].map(r => (
              <Link key={r.label} href={r.href} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 hover:text-blue-600">
                <div className="flex items-center gap-1.5 text-gray-500"><r.icon className="h-3.5 w-3.5" />{r.label}</div>
                <span className="font-semibold text-gray-800">{r.value}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard do Engenheiro ───────────────────────────────────
function DashEngenheiro({ data, user }: { data: any; user: any }) {
  const { obras, atividades, pendencias, inspecoes } = data
  const hoje = new Date().toISOString().split('T')[0]

  const pendValidacao = atividades.filter((a: any) => a.status === 'pendente_validacao').length
  const impedidas     = atividades.filter((a: any) => a.status === 'impedida').length
  const emAndamento   = atividades.filter((a: any) => a.status === 'em_andamento').length
  const concluidas    = atividades.filter((a: any) => a.status === 'concluida').length
  const atrasadas     = atividades.filter((a: any) => a.status !== 'concluida' && a.status !== 'cancelada' && a.data_fim_prev && a.data_fim_prev < hoje).length
  const percMedio     = atividades.length ? Math.round(atividades.reduce((s: number, a: any) => s + (a.percentual_exec || 0), 0) / atividades.length) : 0

  const diaSemana = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataFmt   = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5 w-full">
      {/* Header verde — identidade visual diferente do gestor */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Olá, {user?.nome?.split(' ')[0]} 👷</h1>
            <p className="text-emerald-100 text-sm mt-1 capitalize">{diaSemana}, {dataFmt}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                <Users className="h-3.5 w-3.5" /> {obras.length} obra{obras.length !== 1 ? 's' : ''} vinculada{obras.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <Link href="/pcp-dashboard" className="flex items-center gap-2 bg-white text-emerald-700 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50 shadow-sm">
            <BarChart3 className="h-4 w-4" /> Dashboard PCP
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Em andamento', value: emAndamento,  sub: 'atividades' },
            { label: 'Concluídas',   value: concluidas,   sub: 'atividades' },
            { label: 'Execução',     value: `${percMedio}%`, sub: 'média geral' },
            { label: 'Obras',        value: obras.length, sub: 'vinculadas' },
          ].map(s => (
            <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-emerald-100 font-medium">{s.label}</p>
              <p className="text-[10px] text-emerald-200/80">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ações urgentes */}
      {(pendValidacao > 0 || impedidas > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pendValidacao > 0 && (
            <Link href="/producoes" className="flex items-center gap-4 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Flag className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-700">{pendValidacao}</p>
                <p className="text-sm font-semibold text-amber-600">Aguardando sua validação</p>
                <p className="text-xs text-amber-500">Clique para aprovar ou reprovar</p>
              </div>
            </Link>
          )}
          {impedidas > 0 && (
            <Link href="/pcp" className="flex items-center gap-4 rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4 hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-red-700">{impedidas}</p>
                <p className="text-sm font-semibold text-red-600">Atividades impedidas</p>
                <p className="text-xs text-red-500">Verificar impedimentos</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* KPIs do engenheiro */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Atrasadas',    value: atrasadas,                icon: TrendingDown, color: atrasadas > 0 ? 'text-red-600' : 'text-gray-400',    bg: atrasadas > 0 ? 'bg-red-50' : 'bg-gray-50', href: '/pcp-dashboard' },
          { label: 'Pendências',   value: pendencias.length,        icon: AlertTriangle,color: pendencias.length > 0 ? 'text-amber-600' : 'text-gray-400', bg: 'bg-amber-50', href: '/pendencias' },
          { label: 'Insp. Pend.', value: inspecoes.filter((i: any) => i.status === 'aguardando').length, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', href: '/inspecoes' },
          { label: 'Concluídas',  value: concluidas, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50', href: '/pcp' },
        ].map(k => (
          <Link key={k.label} href={k.href} className={`rounded-2xl border border-transparent ${k.bg} p-5 flex items-center gap-3 hover:shadow-md transition-all`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Minhas obras */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" /> Minhas Obras</h2>
        </div>
        {obras.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            <Building2 className="h-10 w-10 mx-auto mb-2 text-gray-200" />
            Nenhuma obra vinculada ao seu usuário ainda.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {obras.map((o: any) => {
              const ats  = atividades.filter((a: any) => a.obra_id === o.id)
              const conc = ats.filter((a: any) => a.status === 'concluida').length
              const perc = ats.length ? Math.round(ats.reduce((s: number, a: any) => s + (a.percentual_exec || 0), 0) / ats.length) : 0
              const valid= ats.filter((a: any) => a.status === 'pendente_validacao').length
              return (
                <div key={o.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/obras/detail?id=${o.id}`} className="font-semibold text-gray-900 hover:text-blue-600 hover:underline truncate block">{o.nome}</Link>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[120px]">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${perc}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{perc}%</span>
                      <span className="text-xs text-gray-400">{conc}/{ats.length} ativ.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {valid > 0 && (
                      <Link href="/producoes" className="flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 text-xs font-semibold">
                        <Flag className="h-3 w-3" />{valid} valid.
                      </Link>
                    )}
                    <Link href={`/pcp-dashboard?obra=${o.id}`} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                      <GitBranch className="h-3.5 w-3.5" /> PCP
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Últimas atividades em andamento */}
      {atividades.filter((a: any) => a.status === 'em_andamento').length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><Play className="h-4 w-4 text-blue-500" /> Em andamento agora</h3>
            <Link href="/pcp" className="text-xs text-blue-500 hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-2">
            {atividades.filter((a: any) => a.status === 'em_andamento').slice(0, 5).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.nome}</p>
                  {a.empreiteiros?.razao_social && <p className="text-xs text-gray-400">{a.empreiteiros.razao_social}</p>}
                </div>
                <div className="w-20 bg-gray-200 rounded-full h-1.5 shrink-0">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${a.percentual_exec || 0}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{a.percentual_exec || 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal — redireciona por perfil ─────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const perfil   = (user as any)?.perfil ?? 'engenheiro'
  const isGestor = ['administrador', 'gerente'].includes(perfil)

  useEffect(() => {
    dashboardApi.executivo()
      .then(setData)
      .catch(() => setData({ obras: [], atividades: [], pendencias: [], inspecoes: [], efetivosHoje: [], empreiteiros: [], medicoes: [] }))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    </div>
  )

  if (!data) return null

  return isGestor
    ? <DashGestor data={data} user={user} />
    : <DashEngenheiro data={data} user={user} />
}
