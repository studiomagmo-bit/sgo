'use client'
import { useEffect, useState } from 'react'
import { usuariosApi } from '@/lib/api'
import type { Empreiteiro } from '@/types'
import { Plus, Loader2, HardHat, Phone, Mail } from 'lucide-react'

export default function EmpreiteirosPage() {
  const [empreiteiros, setEmpreiteiros] = useState<Empreiteiro[]>([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    usuariosApi.empreiteiros.listar().then(setEmpreiteiros).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empreiteiros</h1>
          <p className="text-sm text-gray-500 mt-1">{empreiteiros.length} empreiteiro(s) cadastrado(s)</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Novo Empreiteiro
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : empreiteiros.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <HardHat className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum empreiteiro cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {empreiteiros.map(e => (
            <div key={e.id} className="rounded-xl border bg-white shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                  {(e.nome_fantasia || e.razao_social).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{e.nome_fantasia || e.razao_social}</p>
                  {e.nome_fantasia && <p className="text-xs text-gray-500">{e.razao_social}</p>}
                  {e.cnpj && <p className="text-xs text-gray-400 mt-0.5">CNPJ: {e.cnpj}</p>}
                </div>
                <span className={`ml-auto shrink-0 ${e.ativo ? 'badge-verde' : 'badge-cinza'}`}>
                  {e.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                {e.responsavel && <p className="font-medium text-gray-700">Resp.: {e.responsavel}</p>}
                {e.telefone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5"/>{e.telefone}</p>}
                {e.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/>{e.email}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
