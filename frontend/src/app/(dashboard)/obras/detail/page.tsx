'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { obrasApi, dashboardApi } from '@/lib/api'
import type { Obra, DashboardObra } from '@/types'
import {
  ArrowLeft, Building2, GitBranch, Users, ClipboardList,
  CheckCircle, AlertTriangle, DollarSign, BookOpen, Loader2,
  MapPin, Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

const TABS = [
  { id: 'visao',      label: 'Visão Geral',   icon: Building2    },
  { id: 'estrutura',  label: 'Estrutura',      icon: GitBranch    },
  { id: 'atividades', label: 'PCP',            icon: ClipboardList },
  { id: 'efetivo',    label: 'Efetivo',        icon: Users        },
  { id: 'inspecoes',  label: 'Inspeções',      icon: CheckCircle  },
  { id: 'pendencias', label: 'Pendências',     icon: AlertTriangle},
  { id: 'medicoes',   label: 'Medições',       icon: DollarSign   },
  { id: 'diario',     label: 'Diário',         icon: BookOpen     },
]

function KpiMini({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

export default function ObraDetailPage() {
  const router = useRouter()
  const [id, setId]           = useState<string | null>(null)
  const [obra, setObra]       = useState<Obra | null>(null)
  const [dash, setDash]       = useState<DashboardObra | null>(null)
  const [tab, setTab]         = useState('visao')
  const [loading, setLoading] = useState(true)

  // Lê o id da query string sem useSearchParams (compatível com output: export)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const obraId = params.get('id')
    setId(obraId)
    if (!obraId) { setLoading(false); return }
    Promise.all([
      obrasApi.detalhar(obraId),
      dashboardApi.obra(obraId),
    ]).then(([o, d]) => {
      setObra(o)
      setDash(d)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }
  if (!id || !obra) {
    return <div className="text-center py-16 text-gray-500">Obra não encontrada.</div>
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => router.push('/obras')} className="flex items-center gap-1 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Obras
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium">{obra.nome}</span>
      </div>

      {/* Header da Obra */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-800 relative">
          {obra.foto_capa_url && (
            <img src={obra.foto_capa_url} alt={obra.nome} className="w-full h-full object-cover opacity-50" />
          )}
          <div className="absolute inset-0 flex items-end p-5">
            <div>
              <h1 className="text-2xl font-bold text-white">{obra.nome}</h1>
              <div className="flex items-center gap-3 mt-1 text-blue-200 text-sm">
                {obra.cidade && <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{obra.cidade}</span>}
                {obra.data_fim_prev && <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>Prazo: {new Date(obra.data_fim_prev).toLocaleDateString('pt-BR')}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs rápidos */}
        {dash && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
            <KpiMini label="Progresso"       value={`${dash.percentual_geral}%`} color="bg-blue-50 text-blue-800" />
            <KpiMini label="Atividades"      value={dash.total_atividades}       color="bg-slate-50 text-slate-800" />
            <KpiMini label="Efetivo Hoje"    value={dash.efetivo_hoje}           color="bg-emerald-50 text-emerald-800" />
            <KpiMini label="Impedimentos"    value={dash.impedimentos_abertos}   color="bg-orange-50 text-orange-800" />
          </div>
        )}
      </div>

      {/* Tabs de navegação */}
      <div className="border-b bg-white rounded-t-xl overflow-x-auto">
        <div className="flex">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo da tab ativa */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        {tab === 'visao' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Informações da Obra</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Tipo',     value: obra.tipo },
                { label: 'Status',   value: obra.status },
                { label: 'Área',     value: obra.area_total ? `${obra.area_total} m²` : '—' },
                { label: 'Endereço', value: obra.endereco || '—' },
                { label: 'CEP',      value: obra.cep || '—' },
                { label: 'Início',   value: obra.data_inicio ? new Date(obra.data_inicio).toLocaleDateString('pt-BR') : '—' },
              ].map(f => (
                <div key={f.label} className="space-y-0.5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{f.label}</p>
                  <p className="font-medium capitalize">{f.value}</p>
                </div>
              ))}
            </div>
            {obra.descricao && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Descrição</p>
                <p className="text-sm text-gray-700">{obra.descricao}</p>
              </div>
            )}
          </div>
        )}
        {tab !== 'visao' && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🚧</div>
            <p className="font-medium">Use o menu lateral para acessar este módulo</p>
            <p className="text-sm mt-1">Filtre por esta obra nas páginas específicas</p>
            <div className="flex justify-center gap-3 mt-4 flex-wrap">
              <Link href={`/pcp?obra_id=${obra.id}`}       className="text-sm text-blue-600 hover:underline">PCP →</Link>
              <Link href={`/efetivo?obra_id=${obra.id}`}   className="text-sm text-blue-600 hover:underline">Efetivo →</Link>
              <Link href={`/inspecoes?obra_id=${obra.id}`} className="text-sm text-blue-600 hover:underline">Inspeções →</Link>
              <Link href={`/medicoes?obra_id=${obra.id}`}  className="text-sm text-blue-600 hover:underline">Medições →</Link>
              <Link href={`/diario?obra_id=${obra.id}`}    className="text-sm text-blue-600 hover:underline">Diário →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
