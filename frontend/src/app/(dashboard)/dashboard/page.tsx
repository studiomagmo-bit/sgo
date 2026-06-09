'use client'
import { useEffect, useState } from 'react'
import { dashboardApi } from '@/lib/api'
import { Building2, Users, AlertTriangle, CheckCircle, TrendingUp, Clock, XCircle, Loader2 } from 'lucide-react'
import type { DashboardObra } from '@/types'
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'
import Link from 'next/link'

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    em_andamento: 'badge-azul', planejamento: 'badge-amarelo',
    concluida: 'badge-verde', pausada: 'badge-cinza', cancelada: 'badge-vermelho',
  }
  const label: Record<string, string> = {
    em_andamento: 'Em andamento', planejamento: 'Planejamento',
    concluida: 'Concluída', pausada: 'Pausada', cancelada: 'Cancelada',
  }
  return <span className={map[status] || 'badge-cinza'}>{label[status] || status}</span>
}

function KpiCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <div className="kpi-card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [obras, setObras] = useState<DashboardObra[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.obras().then(setObras).finally(() => setLoading(false))
  }, [])

  const totais = {
    obras: obras.length,
    emAndamento: obras.filter(o => o.status === 'em_andamento').length,
    efetivo: obras.reduce((a, o) => a + (o.efetivo_hoje || 0), 0),
    impedimentos: obras.reduce((a, o) => a + o.impedimentos_abertos, 0),
    inspecoesPend: obras.reduce((a, o) => a + o.inspecoes_aguardando, 0),
    pendencias: obras.reduce((a, o) => a + o.pendencias_abertas, 0),
    percMedio: obras.length ? Math.round(obras.reduce((a, o) => a + o.percentual_geral, 0) / obras.length) : 0,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Executivo</h1>
        <p className="text-sm text-gray-500 mt-1">Visão consolidada de todas as obras</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Obras Ativas"        value={totais.emAndamento}    icon={Building2}      color="bg-blue-500"   sub={`${totais.obras} total`} />
        <KpiCard title="Efetivo Hoje"        value={totais.efetivo}        icon={Users}          color="bg-emerald-500" />
        <KpiCard title="Impedimentos"        value={totais.impedimentos}   icon={AlertTriangle}  color="bg-orange-500" />
        <KpiCard title="Inspeções Pendentes" value={totais.inspecoesPend}  icon={Clock}          color="bg-yellow-500" />
        <KpiCard title="Pendências Abertas"  value={totais.pendencias}     icon={XCircle}        color="bg-red-500" />
        <KpiCard title="% Médio Execução"    value={`${totais.percMedio}%`} icon={TrendingUp}    color="bg-purple-500" />
        <KpiCard title="Total de Obras"      value={totais.obras}          icon={Building2}      color="bg-slate-500" />
        <KpiCard title="Ins. Aprovadas"      value={obras.reduce((a,o)=>a+o.inspecoes_aprovadas,0)} icon={CheckCircle} color="bg-green-500" />
      </div>

      {/* Tabela de Obras */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Obras</h2>
          <Link href="/obras" className="text-sm text-blue-600 hover:underline">Ver todas →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                {['Obra','Tipo','Status','Progresso','Efetivo Hoje','Impedimentos','Pendências','Inspeções'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {obras.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhuma obra encontrada</td></tr>
              ) : obras.map(o => (
                <tr key={o.obra_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/obras/${o.obra_id}`} className="font-medium text-blue-600 hover:underline">
                      {o.obra_nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{o.tipo}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${o.percentual_geral}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{o.percentual_geral}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{o.efetivo_hoje}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={o.impedimentos_abertos > 0 ? 'badge-vermelho' : 'badge-verde'}>
                      {o.impedimentos_abertos}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={o.pendencias_abertas > 0 ? 'badge-amarelo' : 'badge-verde'}>
                      {o.pendencias_abertas}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={o.inspecoes_aguardando > 0 ? 'badge-azul' : 'badge-cinza'}>
                      {o.inspecoes_aguardando}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
