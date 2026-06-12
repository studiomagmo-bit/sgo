'use client'
import { useEffect, useState } from 'react'
import { obras as obrasApi } from '@/lib/sgoApi'
import { useAuth } from '@/contexts/auth'
import Link from 'next/link'
import { Plus, Building2, MapPin, Calendar, Loader2, Search } from 'lucide-react'
import type { Obra } from '@/types'
import { toast } from 'sonner'

const statusLabel: Record<string, { label: string; cls: string }> = {
  planejamento:  { label: 'Planejamento',  cls: 'badge-amarelo' },
  em_andamento:  { label: 'Em Andamento',  cls: 'badge-azul'    },
  pausada:       { label: 'Pausada',       cls: 'badge-cinza'   },
  concluida:     { label: 'Concluída',     cls: 'badge-verde'   },
  cancelada:     { label: 'Cancelada',     cls: 'badge-vermelho'},
}

export default function ObrasPage() {
  const { user } = useAuth()
  const isGestor = ['administrador', 'gerente'].includes((user as any)?.perfil ?? '')
  const [obras, setObras]       = useState<Obra[]>([])
  const [loading, setLoading]   = useState(true)
  const [busca, setBusca]       = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => {
    obrasApi.listar().then(setObras).finally(() => setLoading(false))
  }, [])

  const filtradas = obras.filter(o => {
    const matchBusca  = o.nome.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = !filtroStatus || o.status === filtroStatus
    return matchBusca && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Obras</h1>
          <p className="text-sm text-gray-500 mt-1">{obras.length} obra(s) cadastrada(s)</p>
        </div>
        {isGestor && (
          <Link
            href="/obras/nova"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova Obra
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar obra..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabel).map(([v, l]) => (
            <option key={v} value={v}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma obra encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtradas.map(obra => {
            const s = statusLabel[obra.status] || { label: obra.status, cls: 'badge-cinza' }
            return (
              <Link
                key={obra.id}
                href={`/obras/detail?id=${obra.id}`}
                className="block rounded-xl border bg-white p-5 hover:shadow-md transition-shadow"
              >
                {/* Capa */}
                <div className="h-32 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {obra.foto_capa_url
                    ? <img src={obra.foto_capa_url} alt={obra.nome} className="w-full h-full object-cover" />
                    : <Building2 className="h-10 w-10 text-gray-900/60" />}
                </div>

                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{obra.nome}</h3>
                  <span className={s.cls}>{s.label}</span>
                </div>

                <div className="space-y-1">
                  {obra.cidade && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {obra.cidade}{obra.estado ? ` — ${obra.estado}` : ''}
                    </div>
                  )}
                  {obra.data_fim_prev && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      Prazo: {new Date(obra.data_fim_prev + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>

                {/* Progresso */}
                {(obra.percentual_geral !== undefined) && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso</span>
                      <span className="font-medium">{obra.percentual_geral}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${obra.percentual_geral}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{obra.tipo}</span>
                  {obra.area_total && <span>{obra.area_total.toLocaleString('pt-BR')} m²</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
