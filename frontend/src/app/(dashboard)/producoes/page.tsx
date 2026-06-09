'use client'
import { useEffect, useState } from 'react'
import { producoes as producoesApi, obras as obrasApi } from '@/lib/sgoApi'
import type { Producao, Obra } from '@/types'
import { Plus, Loader2, ClipboardList } from 'lucide-react'

export default function ProducoesPage() {
  const [obras, setObras]         = useState<Obra[]>([])
  const [obraId, setObraId]       = useState('')
  const [producoes, setProducoes] = useState<Producao[]>([])
  const [loading, setLoading]     = useState(false)

  useEffect(() => { obrasApi.listar().then(setObras) }, [])
  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    producoesApi.listar({ obra_id: obraId }).then(setProducoes).finally(() => setLoading(false))
  }, [obraId])

  const totalProd = producoes.reduce((s, p) => s + Number(p.quantidade), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produções</h1>
          <p className="text-sm text-gray-500 mt-1">Apontamentos de produção por atividade</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Nova Produção
        </button>
      </div>

      <select value={obraId} onChange={e => setObraId(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]">
        <option value="">Selecione uma obra...</option>
        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

      {obraId && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="kpi-card"><p className="text-sm text-muted-foreground">Lançamentos</p><p className="text-2xl font-bold mt-1">{producoes.length}</p></div>
          <div className="kpi-card"><p className="text-sm text-muted-foreground">Total Produzido</p><p className="text-2xl font-bold mt-1">{totalProd.toLocaleString('pt-BR')}</p></div>
          <div className="kpi-card"><p className="text-sm text-muted-foreground">Com Rateio</p><p className="text-2xl font-bold mt-1">{producoes.filter(p => p.individual && p.individual.length > 0).length}</p></div>
        </div>
      )}

      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver as produções</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                {['Data','Atividade','Empreiteiro','Tipo','Quantidade','Rateio','Observação'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {producoes.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Nenhuma produção encontrada</td></tr>
              ) : producoes.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{new Date(p.data).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.atividade_id.substring(0,8)}…</td>
                  <td className="px-4 py-3 text-gray-500">{p.empreiteiro_id?.substring(0,8) ?? '—'}</td>
                  <td className="px-4 py-3 capitalize"><span className="badge-azul">{p.tipo}</span></td>
                  <td className="px-4 py-3 font-semibold">{Number(p.quantidade).toLocaleString('pt-BR')} {p.unidade}</td>
                  <td className="px-4 py-3">
                    {p.individual && p.individual.length > 0
                      ? <span className="badge-verde">{p.individual.length} colab.</span>
                      : <span className="badge-cinza">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{p.observacoes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
