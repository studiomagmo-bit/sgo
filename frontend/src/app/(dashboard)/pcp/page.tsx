'use client'
import { useEffect, useState } from 'react'
import { pcpApi, obrasApi } from '@/lib/api'
import type { Atividade, Obra } from '@/types'
import { Plus, Filter, Loader2, GitBranch, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

const statusConfig: Record<string, { label: string; cls: string }> = {
  planejada:    { label: 'Planejada',    cls: 'badge-cinza'   },
  em_andamento: { label: 'Em Andamento', cls: 'badge-azul'    },
  concluida:    { label: 'Concluída',    cls: 'badge-verde'   },
  bloqueada:    { label: 'Bloqueada',    cls: 'badge-vermelho'},
  cancelada:    { label: 'Cancelada',    cls: 'badge-cinza'   },
}

const prioridadeConfig: Record<string, { label: string; cls: string }> = {
  baixa:   { label: 'Baixa',   cls: 'badge-cinza'   },
  media:   { label: 'Média',   cls: 'badge-azul'    },
  alta:    { label: 'Alta',    cls: 'badge-amarelo' },
  critica: { label: 'Crítica', cls: 'badge-vermelho'},
}

export default function PCPPage() {
  const [obras, setObras]           = useState<Obra[]>([])
  const [obraId, setObraId]         = useState('')
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading]       = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => { obrasApi.listar().then(setObras) }, [])

  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    pcpApi.atividades.listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(setAtividades).finally(() => setLoading(false))
  }, [obraId, filtroStatus])

  const totais = {
    total:        atividades.length,
    concluidas:   atividades.filter(a => a.status === 'concluida').length,
    em_andamento: atividades.filter(a => a.status === 'em_andamento').length,
    bloqueadas:   atividades.filter(a => a.status === 'bloqueada').length,
    percMedio:    atividades.length ? Math.round(atividades.reduce((s, a) => s + Number(a.percentual_exec), 0) / atividades.length) : 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PCP — Atividades</h1>
          <p className="text-sm text-gray-500 mt-1">Planejamento e controle de produção</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Nova Atividade
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select value={obraId} onChange={e => setObraId(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]">
          <option value="">Selecione uma obra...</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          {Object.entries(statusConfig).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
        </select>
      </div>

      {/* KPIs */}
      {obraId && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { l: 'Total',        v: totais.total,         c: 'bg-slate-100 text-slate-800' },
            { l: 'Concluídas',   v: totais.concluidas,    c: 'bg-green-100 text-green-800' },
            { l: 'Em Andamento', v: totais.em_andamento,  c: 'bg-blue-100  text-blue-800'  },
            { l: 'Bloqueadas',   v: totais.bloqueadas,    c: 'bg-red-100   text-red-800'   },
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
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
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
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Nenhuma atividade encontrada</td></tr>
              ) : atividades.map(a => {
                const s = statusConfig[a.status] || { label: a.status, cls: 'badge-cinza' }
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
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${a.percentual_exec}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{a.percentual_exec}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{Number(a.quantidade_prev).toLocaleString('pt-BR')} {a.unidade}</td>
                    <td className="px-4 py-3 text-gray-600">{Number(a.quantidade_exec).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-gray-500">{a.data_inicio_prev ? new Date(a.data_inicio_prev).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.data_fim_prev ? new Date(a.data_fim_prev).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3"><span className={s.cls}>{s.label}</span></td>
                    <td className="px-4 py-3"><span className={p.cls}>{p.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
