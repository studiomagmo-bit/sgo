'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { obras as obrasApi, dashboard as dashboardApi, estruturaObra } from '@/lib/sgoApi'
import type { Obra, DashboardObra } from '@/types'
import {
  ArrowLeft, Building2, GitBranch, Users, ClipboardList,
  CheckCircle, AlertTriangle, DollarSign, BookOpen, Loader2,
  MapPin, Calendar, ExternalLink,
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

// ─── Badge de tipo de nó ──────────────────────────────────────
const tipoCor: Record<string, string> = {
  bloco:      'bg-blue-100 text-blue-800',
  pavimento:  'bg-purple-100 text-purple-800',
  unidade:    'bg-emerald-100 text-emerald-800',
  area:       'bg-amber-100 text-amber-800',
  servico:    'bg-rose-100 text-rose-800',
}

function TipoBadge({ tipo }: { tipo: string }) {
  const cls = tipoCor[tipo] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {tipo}
    </span>
  )
}

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
  const [id, setId]               = useState<string | null>(null)
  const [obra, setObra]           = useState<Obra | null>(null)
  const [dash, setDash]           = useState<DashboardObra | null>(null)
  const [tab, setTab]             = useState('visao')
  const [loading, setLoading]     = useState(true)

  // Estrutura da Obra
  const [estrutura, setEstrutura]         = useState<any[]>([])
  const [loadingEstrutura, setLoadingEstrutura] = useState(false)

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

  // Carrega estrutura quando a aba é selecionada ou na montagem
  useEffect(() => {
    if (!id) return
    setLoadingEstrutura(true)
    estruturaObra
      .listar(id)
      .then(setEstrutura)
      .catch(() => setEstrutura([]))
      .finally(() => setLoadingEstrutura(false))
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }
  if (!id || !obra) {
    return <div className="text-center py-16 text-gray-500">Obra não encontrada.</div>
  }

  // Nós raiz e seus filhos diretos para exibição resumida
  const nosRaiz   = estrutura.filter(n => (n.parent_id ?? null) === null)
  const filhosDe  = (parentId: string) => estrutura.filter(n => n.parent_id === parentId)

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
          <div className="absolute inset-0 flex items-end justify-between p-5">
            <div>
              <h1 className="text-2xl font-bold text-white">{obra.nome}</h1>
              <div className="flex items-center gap-3 mt-1 text-blue-200 text-sm">
                {obra.cidade && <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{obra.cidade}</span>}
                {obra.data_fim_prev && <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>Prazo: {new Date(obra.data_fim_prev).toLocaleDateString('pt-BR')}</span>}
              </div>
            </div>
            {/* Botão de destaque — Estrutura da Obra */}
            <button
              onClick={() => router.push(`/obras/estrutura?id=${id}`)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors shadow-sm"
            >
              <GitBranch className="h-4 w-4" />
              Estrutura da Obra
            </button>
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

      {/* ── Seção: Estrutura da Obra ────────────────────────────── */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Estrutura da Obra</h2>
            {!loadingEstrutura && (
              <span className="text-xs text-gray-500 font-normal">
                — {estrutura.length} {estrutura.length === 1 ? 'nó cadastrado' : 'nós cadastrados'}
              </span>
            )}
          </div>
          <button
            onClick={() => router.push(`/obras/estrutura?id=${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Gerenciar Estrutura <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        {loadingEstrutura ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : estrutura.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
            <GitBranch className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">
              Estrutura não definida —{' '}
              <button
                onClick={() => router.push(`/obras/estrutura?id=${id}`)}
                className="text-blue-600 hover:underline font-medium"
              >
                clique em &quot;Estrutura da Obra&quot; para configurar
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {nosRaiz.map(raiz => {
              const filhos = filhosDe(raiz.id)
              return (
                <div key={raiz.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  {/* Nó raiz */}
                  <div className="flex items-center gap-2 mb-1">
                    <TipoBadge tipo={raiz.tipo} />
                    <span className="text-sm font-semibold text-gray-800">{raiz.nome}</span>
                  </div>
                  {/* Filhos diretos */}
                  {filhos.length > 0 && (
                    <div className="ml-4 mt-2 flex flex-wrap gap-2">
                      {filhos.map(filho => (
                        <div key={filho.id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 py-1">
                          <span className="text-gray-400 text-xs">└</span>
                          <TipoBadge tipo={filho.tipo} />
                          <span className="text-xs text-gray-700">{filho.nome}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => router.push(`/obras/estrutura?id=${id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Gerenciar Estrutura →
              </button>
            </div>
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
