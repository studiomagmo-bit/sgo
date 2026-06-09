'use client'
import { useEffect, useState } from 'react'
import { inspecoes as inspecoesApi, obras as obrasApi } from '@/lib/sgoApi'
import type { Inspecao, Obra } from '@/types'
import { Plus, Loader2, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

const statusConfig: Record<string, { label: string; cls: string; icon: any }> = {
  aguardando:             { label: 'Aguardando',          cls: 'badge-amarelo', icon: Clock       },
  aprovada:               { label: 'Aprovada',            cls: 'badge-verde',   icon: CheckCircle },
  aprovada_com_ressalvas: { label: 'Com Ressalvas',       cls: 'badge-azul',    icon: AlertCircle },
  reprovada:              { label: 'Reprovada',           cls: 'badge-vermelho',icon: XCircle     },
}

export default function InspecoesPage() {
  const [obras, setObras]           = useState<Obra[]>([])
  const [obraId, setObraId]         = useState('')
  const [inspecoes, setInspecoes]   = useState<Inspecao[]>([])
  const [loading, setLoading]       = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => { obrasApi.listar().then(setObras) }, [])

  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    inspecoesApi.listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(setInspecoes).finally(() => setLoading(false))
  }, [obraId, filtroStatus])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspeções</h1>
          <p className="text-sm text-gray-500 mt-1">Controle de qualidade e aprovações</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Nova Inspeção
        </button>
      </div>

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

      {/* KPIs rápidos */}
      {obraId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(statusConfig).map(([k, v]) => {
            const count = inspecoes.filter(i => i.status === k).length
            const Icon = v.icon
            return (
              <button key={k} onClick={() => setFiltroStatus(filtroStatus === k ? '' : k)}
                className={`rounded-xl p-4 border-2 text-left transition-all ${filtroStatus === k ? 'border-blue-500 shadow-md' : 'border-transparent bg-white shadow-sm hover:shadow-md'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-gray-500" />
                  <p className="text-xs text-gray-500">{v.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Tabela */}
      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver as inspeções</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                {['Atividade','Inspetor','Data Solicitação','Data Inspeção','Status','Libera Medição'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inspecoes.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Nenhuma inspeção encontrada</td></tr>
              ) : inspecoes.map(i => {
                const s = statusConfig[i.status] || { label: i.status, cls: 'badge-cinza', icon: Clock }
                return (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{i.atividade_id}</td>
                    <td className="px-4 py-3 text-gray-500">{i.inspetor_id || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(i.data_solicitacao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-gray-500">{i.data_inspecao ? new Date(i.data_inspecao).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3"><span className={s.cls}>{s.label}</span></td>
                    <td className="px-4 py-3">
                      <span className={i.libera_medicao ? 'badge-verde' : 'badge-cinza'}>
                        {i.libera_medicao ? 'Sim' : 'Não'}
                      </span>
                    </td>
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
