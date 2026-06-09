'use client'
import { useEffect, useState } from 'react'
import { diario as diarioApi, obras as obrasApi } from '@/lib/sgoApi'
import type { DiarioObra, Obra } from '@/types'
import { BookOpen, Loader2, Plus, Users, Camera, AlertTriangle, CheckCircle } from 'lucide-react'

export default function DiarioPage() {
  const [obras, setObras]     = useState<Obra[]>([])
  const [obraId, setObraId]   = useState('')
  const [diarios, setDiarios] = useState<DiarioObra[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { obrasApi.listar().then(setObras) }, [])

  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    diarioApi.listar({ obra_id: obraId }).then(setDiarios).finally(() => setLoading(false))
  }, [obraId])

  const hoje = new Date().toISOString().split('T')[0]

  const gerarHoje = async () => {
    if (!obraId) return
    
    diarioApi.listar({ obra_id: obraId }).then(setDiarios)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diário de Obra</h1>
          <p className="text-sm text-gray-500 mt-1">Registro automático das atividades diárias</p>
        </div>
        {obraId && (
          <button onClick={gerarHoje}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> Gerar Diário Hoje
          </button>
        )}
      </div>

      <select value={obraId} onChange={e => setObraId(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]">
        <option value="">Selecione uma obra...</option>
        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver o diário</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="space-y-3">
          {diarios.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-gray-400">
              Nenhum diário encontrado. Clique em "Gerar Diário Hoje" para criar.
            </div>
          ) : diarios.map(d => (
            <div key={d.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
                <div>
                  <p className="font-semibold text-gray-900">
                    {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {d.gerado_auto ? '🤖 Gerado automaticamente' : '✍️ Manual'}
                    {d.publicado && ' · ✅ Publicado'}
                  </p>
                </div>
                <div className="flex gap-3">
                  {!d.publicado && (
                    <button className="text-xs text-blue-600 hover:underline">Publicar</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-0 divide-x divide-y md:divide-y-0">
                {[
                  { icon: Users,         label: 'Efetivo',     v: `${d.efetivo_presente}/${d.efetivo_previsto}` },
                  { icon: CheckCircle,   label: 'Produções',   v: d.total_producoes  },
                  { icon: AlertTriangle, label: 'Impedimentos',v: d.total_impedimentos },
                  { icon: AlertTriangle, label: 'Pendências',  v: d.total_pendencias  },
                  { icon: Camera,        label: 'Fotos',       v: d.total_fotos       },
                ].map(({ icon: Icon, label, v }) => (
                  <div key={label} className="flex flex-col items-center py-4 px-3">
                    <Icon className="h-4 w-4 text-gray-400 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{v}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
              {d.descricao_geral && (
                <div className="px-5 py-3 border-t bg-slate-50/50 text-sm text-gray-600">
                  {d.descricao_geral}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
