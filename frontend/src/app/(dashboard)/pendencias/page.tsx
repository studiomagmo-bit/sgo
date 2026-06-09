'use client'
import { useEffect, useState } from 'react'
import { pendencias as pendenciasApi, obras as obrasApi } from '@/lib/sgoApi'
import type { Pendencia, Obra } from '@/types'
import { Plus, Loader2, AlertTriangle } from 'lucide-react'

const statusConfig: Record<string, { label: string; cls: string }> = {
  criada:      { label: 'Criada',      cls: 'badge-azul'    },
  em_correcao: { label: 'Em Correção', cls: 'badge-amarelo' },
  corrigida:   { label: 'Corrigida',   cls: 'badge-verde'   },
  validada:    { label: 'Validada',    cls: 'badge-cinza'   },
  cancelada:   { label: 'Cancelada',   cls: 'badge-vermelho'},
}

export default function PendenciasPage() {
  const [obras, setObras]           = useState<Obra[]>([])
  const [obraId, setObraId]         = useState('')
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [loading, setLoading]       = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => { obrasApi.listar().then(setObras) }, [])

  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    pendenciasApi.listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(setPendencias).finally(() => setLoading(false))
  }, [obraId, filtroStatus])

  const abertas = pendencias.filter(p => !['validada','cancelada'].includes(p.status)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pendências</h1>
          <p className="text-sm text-gray-500 mt-1">Não conformidades e itens a corrigir</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Nova Pendência
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

      {obraId && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(statusConfig).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white border p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500">{v.label}</p>
              <p className="text-xl font-bold mt-1">{pendencias.filter(p => p.status === k).length}</p>
            </div>
          ))}
        </div>
      )}

      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300"/>
          <p>Selecione uma obra para ver as pendências</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="space-y-3">
          {pendencias.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-gray-400">Nenhuma pendência encontrada.</div>
          ) : pendencias.map(p => {
            const s = statusConfig[p.status]
            return (
              <div key={p.id} className="rounded-xl border bg-white shadow-sm p-4 flex items-start gap-4">
                <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${p.status === 'criada' ? 'text-red-500' : 'text-yellow-500'}`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{p.descricao}</p>
                    <span className={s.cls}>{s.label}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {p.prazo && <span>Prazo: {new Date(p.prazo).toLocaleDateString('pt-BR')}</span>}
                    <span>Criada em: {new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                    {p.inspecao_id && <span className="badge-azul">Vinculada à inspeção</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
