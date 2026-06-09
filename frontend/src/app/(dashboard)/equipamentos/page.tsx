'use client'
import { useEffect, useState } from 'react'
import { equipamentos as equipamentosApi } from '@/lib/sgoApi'
import type { Equipamento } from '@/types'
import { Plus, Loader2, Truck } from 'lucide-react'

const statusConfig: Record<string, { label: string; cls: string }> = {
  disponivel: { label: 'Disponível', cls: 'badge-verde'   },
  reservado:  { label: 'Reservado',  cls: 'badge-azul'    },
  em_uso:     { label: 'Em Uso',     cls: 'badge-amarelo' },
  manutencao: { label: 'Manutenção', cls: 'badge-vermelho'},
  inativo:    { label: 'Inativo',    cls: 'badge-cinza'   },
}

export default function EquipamentosPage() {
  const [equips, setEquips]   = useState<Equipamento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState('')

  useEffect(() => {
    equipamentosApi.listar().then(setEquips).finally(() => setLoading(false))
  }, [])

  const filtrados = equips.filter(e => !filtro || e.status === filtro)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipamentos</h1>
          <p className="text-sm text-gray-500 mt-1">{equips.length} equipamento(s) cadastrado(s)</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Novo Equipamento
        </button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltro('')}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${!filtro ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
          Todos ({equips.length})
        </button>
        {Object.entries(statusConfig).map(([k, v]) => (
          <button key={k} onClick={() => setFiltro(filtro === k ? '' : k)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filtro === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
            {v.label} ({equips.filter(e => e.status === k).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum equipamento encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(e => {
            const s = statusConfig[e.status]
            return (
              <div key={e.id} className="rounded-xl border bg-white shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{e.nome}</p>
                      {e.modelo && <p className="text-xs text-gray-500">{e.fabricante} — {e.modelo}</p>}
                    </div>
                  </div>
                  <span className={s.cls}>{s.label}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Origem</span>
                    <span className="font-medium capitalize">{e.origem}</span>
                  </div>
                  {e.codigo_patrimonial && (
                    <div className="flex justify-between">
                      <span>Patrimônio</span>
                      <span className="font-medium">{e.codigo_patrimonial}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
