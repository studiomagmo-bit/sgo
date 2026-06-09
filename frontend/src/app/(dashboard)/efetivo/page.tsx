'use client'
import { useEffect, useState } from 'react'
import { efetivos as efetivosApi, obras as obrasApi } from '@/lib/sgoApi'
import type { EfetivoDiario, Obra } from '@/types'
import { Plus, Loader2, Users, UserCheck, UserX } from 'lucide-react'

export default function EfetivoPage() {
  const [obras, setObras]         = useState<Obra[]>([])
  const [obraId, setObraId]       = useState('')
  const [efetivos, setEfetivos]   = useState<EfetivoDiario[]>([])
  const [loading, setLoading]     = useState(false)

  useEffect(() => { obrasApi.listar().then(setObras) }, [])

  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    efetivosApi.listar({ obra_id: obraId })
      .then(setEfetivos).finally(() => setLoading(false))
  }, [obraId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Efetivo Diário</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de presença por equipe</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Registrar Efetivo
        </button>
      </div>

      <select value={obraId} onChange={e => setObraId(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]">
        <option value="">Selecione uma obra...</option>
        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver o efetivo</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="space-y-3">
          {efetivos.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-gray-400">Nenhum efetivo registrado.</div>
          ) : efetivos.map(ef => {
            const presentes = ef.colaboradores?.filter(c => c.presente).length ?? 0
            const ausentes  = ef.colaboradores?.filter(c => !c.presente).length ?? 0
            return (
              <div key={ef.id} className="rounded-xl border bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{new Date(ef.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                    <p className="text-sm text-gray-500">Empreiteiro: {ef.empreiteiro_id}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600 font-medium"><UserCheck className="h-4 w-4"/>{presentes} presentes</span>
                    <span className="flex items-center gap-1 text-red-500 font-medium"><UserX className="h-4 w-4"/>{ausentes} ausentes</span>
                  </div>
                </div>
                {ef.colaboradores && ef.colaboradores.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ef.colaboradores.map(c => (
                      <span key={c.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.presente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.presente ? '✓' : '✗'} {c.colaborador_id.substring(0,8)}…
                        {!c.presente && c.motivo_ausencia && ` (${c.motivo_ausencia})`}
                      </span>
                    ))}
                  </div>
                )}
                {ef.observacoes && <p className="mt-2 text-sm text-gray-500 italic">{ef.observacoes}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
