'use client'
import { useEffect, useState } from 'react'
import { medicoes as medicoesApi, obras as obrasApi } from '@/lib/sgoApi'
import type { Medicao, Obra } from '@/types'
import { Plus, Loader2, DollarSign } from 'lucide-react'

const statusConfig: Record<string, { label: string; cls: string }> = {
  aberta:   { label: 'Aberta',   cls: 'badge-azul'    },
  fechada:  { label: 'Fechada',  cls: 'badge-amarelo' },
  aprovada: { label: 'Aprovada', cls: 'badge-verde'   },
  paga:     { label: 'Paga',     cls: 'badge-cinza'   },
}

const fmt = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'

export default function MedicoesPage() {
  const [obras, setObras]         = useState<Obra[]>([])
  const [obraId, setObraId]       = useState('')
  const [medicoes, setMedicoes]   = useState<Medicao[]>([])
  const [loading, setLoading]     = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => { obrasApi.listar().then(setObras) }, [])

  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    medicoesApi.listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(setMedicoes).finally(() => setLoading(false))
  }, [obraId, filtroStatus])

  const totalBruto  = medicoes.reduce((s, m) => s + Number(m.valor_bruto),  0)
  const totalLiq    = medicoes.reduce((s, m) => s + Number(m.valor_liquido), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medições</h1>
          <p className="text-sm text-gray-500 mt-1">Banco de medição e aprovações</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Nova Medição
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="kpi-card">
            <p className="text-sm text-muted-foreground">Total de Medições</p>
            <p className="text-2xl font-bold mt-1">{medicoes.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-sm text-muted-foreground">Total Bruto</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalBruto)}</p>
          </div>
          <div className="kpi-card">
            <p className="text-sm text-muted-foreground">Total Líquido</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{fmt(totalLiq)}</p>
          </div>
        </div>
      )}

      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver as medições</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                {['Nº','Empreiteiro','Período','Valor Bruto','Desconto','Valor Líquido','Status','Aprovada em'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicoes.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Nenhuma medição encontrada</td></tr>
              ) : medicoes.map(m => {
                const s = statusConfig[m.status] || { label: m.status, cls: 'badge-cinza' }
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">#{m.numero}</td>
                    <td className="px-4 py-3 text-gray-600">{m.empreiteiro_id}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(m.periodo_inicio).toLocaleDateString('pt-BR')} — {new Date(m.periodo_fim).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">{fmt(Number(m.valor_bruto))}</td>
                    <td className="px-4 py-3 text-red-600">{fmt(Number(m.valor_desconto))}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{fmt(Number(m.valor_liquido))}</td>
                    <td className="px-4 py-3"><span className={s.cls}>{s.label}</span></td>
                    <td className="px-4 py-3 text-gray-500">{m.aprovada_em ? new Date(m.aprovada_em).toLocaleDateString('pt-BR') : '—'}</td>
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
