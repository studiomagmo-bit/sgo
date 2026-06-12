'use client'
import { useEffect, useState, useMemo } from 'react'
import { dashboard as dashboardApi, obras as obrasApi, estruturaObra } from '@/lib/sgoApi'
import { useAuth } from '@/contexts/auth'
import {
  BarChart3, CheckCircle2, Clock, TrendingDown, TrendingUp,
  AlertTriangle, Loader2, Building2, HardHat, GitBranch,
  ArrowUpRight, ArrowDownRight, Minus, Filter, RefreshCw,
  ChevronRight, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

// ── Tipos ──────────────────────────────────────────────────────
type StatusDesvio = 'adiantada' | 'no_prazo' | 'em_risco' | 'atrasada' | 'nao_iniciada' | 'concluida' | 'sem_prazo'

function calcDesvio(a: any): { planejado: number | null; desvio: number | null; statusDesvio: StatusDesvio } {
  if (a.status === 'concluida') return { planejado: 100, desvio: null, statusDesvio: 'concluida' }
  if (!a.data_inicio_prev || !a.data_fim_prev) return { planejado: null, desvio: null, statusDesvio: 'sem_prazo' }
  const hoje  = new Date()
  const inicio = new Date(a.data_inicio_prev + 'T12:00:00')
  const fim    = new Date(a.data_fim_prev    + 'T12:00:00')
  if (hoje < inicio) return { planejado: 0, desvio: a.percentual_exec || 0, statusDesvio: 'nao_iniciada' }
  const totalMs   = fim.getTime() - inicio.getTime()
  const passadoMs = hoje.getTime() - inicio.getTime()
  const planejado = totalMs <= 0 ? 100 : Math.min(100, Math.round((passadoMs / totalMs) * 100))
  const desvio    = (a.percentual_exec || 0) - planejado
  let statusDesvio: StatusDesvio
  if (desvio > 5)         statusDesvio = 'adiantada'
  else if (desvio >= -5)  statusDesvio = 'no_prazo'
  else if (desvio >= -25) statusDesvio = 'em_risco'
  else                    statusDesvio = 'atrasada'
  return { planejado, desvio, statusDesvio }
}

const STATUS_LABEL: Record<StatusDesvio, string> = {
  adiantada: 'Adiantada', no_prazo: 'No prazo', em_risco: 'Em risco',
  atrasada: 'Atrasada', nao_iniciada: 'Não iniciada', concluida: 'Concluída', sem_prazo: 'Sem prazo',
}
const STATUS_COLOR: Record<StatusDesvio, string> = {
  adiantada:    'bg-emerald-100 text-emerald-700 border-emerald-300',
  no_prazo:     'bg-blue-100    text-blue-700    border-blue-300',
  em_risco:     'bg-amber-100   text-amber-700   border-amber-300',
  atrasada:     'bg-red-100     text-red-700     border-red-300',
  nao_iniciada: 'bg-gray-100    text-gray-500    border-gray-300',
  concluida:    'bg-teal-100    text-teal-700    border-teal-300',
  sem_prazo:    'bg-gray-50     text-gray-400    border-gray-200',
}
const STATUS_DOT: Record<StatusDesvio, string> = {
  adiantada: 'bg-emerald-500', no_prazo: 'bg-blue-500', em_risco: 'bg-amber-400',
  atrasada: 'bg-red-500', nao_iniciada: 'bg-gray-300', concluida: 'bg-teal-500', sem_prazo: 'bg-gray-200',
}

// ── Componente ProgressDual ────────────────────────────────────
function ProgressDual({ exec, planejado, color }: { exec: number; planejado: number | null; color: string }) {
  return (
    <div className="relative w-full h-3">
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className={`h-3 rounded-full transition-all ${color}`} style={{ width: `${Math.min(exec, 100)}%` }} />
      </div>
      {planejado !== null && (
        <div
          className="absolute top-0 h-3 w-0.5 bg-gray-500/40 rounded"
          style={{ left: `${Math.min(planejado, 100)}%` }}
          title={`Planejado: ${planejado}%`}
        />
      )}
    </div>
  )
}

const BAR_COLOR: Record<StatusDesvio, string> = {
  adiantada: 'bg-emerald-500', no_prazo: 'bg-blue-500', em_risco: 'bg-amber-400',
  atrasada: 'bg-red-500', nao_iniciada: 'bg-gray-200', concluida: 'bg-teal-500', sem_prazo: 'bg-gray-200',
}

// ── Árvore de estrutura ────────────────────────────────────────
interface EstruturaNode {
  id: string; nome: string; tipo: string; parent_id: string | null; ordem: number
  children: EstruturaNode[]
  atividades: any[]
}

function buildTree(nos: any[], atividades: any[]): EstruturaNode[] {
  const map: Record<string, EstruturaNode> = {}
  nos.forEach(n => { map[n.id] = { ...n, children: [], atividades: [] } })
  atividades.forEach(a => {
    if (a.estrutura_id && map[a.estrutura_id]) map[a.estrutura_id].atividades.push(a)
  })
  const roots: EstruturaNode[] = []
  nos.forEach(n => {
    if (n.parent_id && map[n.parent_id]) map[n.parent_id].children.push(map[n.id])
    else if (!n.parent_id) roots.push(map[n.id])
  })
  return roots
}

function nodeSummary(node: EstruturaNode): { total: number; atrasadas: number; emRisco: number; concluidas: number; noPrazo: number } {
  const allAtivs: any[] = []
  function collect(n: EstruturaNode) {
    n.atividades.forEach(a => allAtivs.push(a))
    n.children.forEach(collect)
  }
  collect(node)
  return {
    total:     allAtivs.length,
    atrasadas: allAtivs.filter(a => calcDesvio(a).statusDesvio === 'atrasada').length,
    emRisco:   allAtivs.filter(a => calcDesvio(a).statusDesvio === 'em_risco').length,
    concluidas:allAtivs.filter(a => calcDesvio(a).statusDesvio === 'concluida').length,
    noPrazo:   allAtivs.filter(a => ['no_prazo','adiantada'].includes(calcDesvio(a).statusDesvio)).length,
  }
}

function TreeNode({ node, depth = 0, expandAll }: { node: EstruturaNode; depth?: number; expandAll?: boolean | null }) {
  const [open, setOpen] = useState(depth < 2)
  useEffect(() => {
    if (expandAll === true)  setOpen(true)
    if (expandAll === false) setOpen(false)
  }, [expandAll])

  const sum = useMemo(() => nodeSummary(node), [node])
  const hasChildren = node.children.length > 0 || node.atividades.length > 0

  // Cor do nó baseada no pior status
  const nodeColor = sum.atrasadas > 0
    ? 'border-red-200 bg-red-50'
    : sum.emRisco > 0
    ? 'border-amber-200 bg-amber-50'
    : sum.concluidas === sum.total && sum.total > 0
    ? 'border-teal-200 bg-teal-50'
    : sum.total > 0
    ? 'border-blue-200 bg-blue-50'
    : 'border-gray-200 bg-gray-50'

  const dotColor = sum.atrasadas > 0 ? 'bg-red-500'
    : sum.emRisco > 0 ? 'bg-amber-400'
    : sum.concluidas === sum.total && sum.total > 0 ? 'bg-teal-500'
    : sum.total > 0 ? 'bg-blue-500' : 'bg-gray-300'

  return (
    <div className={`ml-${depth > 0 ? 4 : 0}`}>
      <button
        onClick={() => hasChildren && setOpen(o => !o)}
        className={clsx(
          'w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all mb-1',
          nodeColor,
          hasChildren ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
        )}
      >
        {/* Ícone expand */}
        <span className="w-4 shrink-0">
          {hasChildren && (open
            ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
          )}
        </span>

        {/* Dot status */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />

        {/* Nome */}
        <span className="flex-1 text-sm font-medium text-gray-800 truncate">{node.nome}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide shrink-0">{node.tipo}</span>

        {/* Badges */}
        {sum.total > 0 && (
          <div className="flex items-center gap-1 ml-2">
            {sum.atrasadas > 0 && (
              <span className="rounded-full bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold">
                {sum.atrasadas} atras.
              </span>
            )}
            {sum.emRisco > 0 && (
              <span className="rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold">
                {sum.emRisco} risco
              </span>
            )}
            {sum.concluidas > 0 && (
              <span className="rounded-full bg-teal-100 text-teal-700 border border-teal-200 px-1.5 py-0.5 text-[10px] font-semibold">
                {sum.concluidas}✓
              </span>
            )}
            <span className="text-[10px] text-gray-400">{sum.total} ativ.</span>
          </div>
        )}
      </button>

      {/* Filhos e atividades */}
      {open && (
        <div className="ml-4 border-l-2 border-gray-200 pl-3 mb-2">
          {/* Atividades deste nó */}
          {node.atividades.map(a => {
            const { statusDesvio, planejado, desvio } = calcDesvio(a)
            return (
              <div key={a.id} className={clsx(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 mb-1 text-xs',
                statusDesvio === 'atrasada' ? 'border-red-200 bg-red-50' :
                statusDesvio === 'em_risco' ? 'border-amber-100 bg-amber-50' :
                statusDesvio === 'concluida' ? 'border-teal-100 bg-teal-50' :
                'border-gray-100 bg-white'
              )}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[statusDesvio]}`} />
                <span className="flex-1 text-gray-700 truncate font-medium">{a.nome}</span>
                {/* mini barra */}
                <div className="w-16 relative">
                  <ProgressDual exec={a.percentual_exec || 0} planejado={planejado} color={BAR_COLOR[statusDesvio]} />
                </div>
                <span className="w-8 text-right text-gray-600 font-semibold">{a.percentual_exec || 0}%</span>
                {desvio !== null && (
                  <span className={clsx('w-12 text-right font-bold',
                    desvio > 0 ? 'text-emerald-600' : desvio < 0 ? 'text-red-600' : 'text-gray-400'
                  )}>
                    {desvio > 0 ? '+' : ''}{desvio}%
                  </span>
                )}
              </div>
            )
          })}
          {/* Subnós */}
          {node.children
            .sort((a, b) => a.ordem - b.ordem)
            .map(child => <TreeNode key={child.id} node={child} depth={depth + 1} expandAll={expandAll} />)
          }
        </div>
      )}
    </div>
  )
}

// ── Atividades sem estrutura ───────────────────────────────────
function AtividadesSemEstrutura({ atividades }: { atividades: any[] }) {
  const [open, setOpen] = useState(true)
  if (atividades.length === 0) return null
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-gray-500 mb-1 hover:text-gray-700">
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Sem localização ({atividades.length})
      </button>
      {open && atividades.map(a => {
        const { statusDesvio, planejado, desvio } = calcDesvio(a)
        return (
          <div key={a.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-1.5 mb-1 text-xs ml-4">
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[statusDesvio]}`} />
            <span className="flex-1 text-gray-700 truncate">{a.nome}</span>
            <div className="w-16"><ProgressDual exec={a.percentual_exec || 0} planejado={planejado} color={BAR_COLOR[statusDesvio]} /></div>
            <span className="w-8 text-right text-gray-600 font-semibold">{a.percentual_exec || 0}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────
type Obra = { id: string; nome: string }

export default function PcpDashboardPage() {
  const { user } = useAuth()
  const isGestor = ['administrador', 'gerente'].includes((user as any)?.perfil ?? '')

  const [obras, setObras]             = useState<Obra[]>([])
  const [atividades, setAtividades]   = useState<any[]>([])
  const [estruturaNos, setEstruturaNos] = useState<any[]>([])
  const [obraFiltro, setObraFiltro]   = useState<string>('todas')
  const [statusFiltro, setStatusFiltro] = useState<string>('todos')
  const [viewMode, setViewMode]       = useState<'arvore' | 'tabela'>('arvore')
  const [loading, setLoading]         = useState(true)
  const [erro, setErro]               = useState('')
  const [expandAllTree, setExpandAllTree] = useState<boolean | null>(null)  // null = default, true = all open, false = all closed

  async function carregar(obra_id?: string) {
    setLoading(true)
    setErro('')
    try {
      const obraId = obra_id === 'todas' ? undefined : obra_id
      const [obs, ativs] = await Promise.all([
        obrasApi.listar(),
        dashboardApi.pcp(obraId),
      ])
      setObras(obs)
      setAtividades(ativs)
      // Carrega estrutura se obra selecionada
      if (obraId) {
        const nos = await estruturaObra.listar(obraId)
        setEstruturaNos(nos)
      } else {
        setEstruturaNos([])
      }
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Engenheiro: carrega sua obra automaticamente
    obrasApi.listar().then(obs => {
      if (!isGestor && obs.length === 1) {
        setObraFiltro(obs[0].id)
        carregar(obs[0].id)
      } else {
        carregar()
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function trocarObra(id: string) {
    setObraFiltro(id)
    await carregar(id)
  }

  const atividadesComDesvio = useMemo(() =>
    atividades.map(a => ({ ...a, ...calcDesvio(a) }))
  , [atividades])

  const atividadesFiltradas = useMemo(() =>
    statusFiltro === 'todos'
      ? atividadesComDesvio
      : atividadesComDesvio.filter(a => a.statusDesvio === statusFiltro)
  , [atividadesComDesvio, statusFiltro])

  const kpis = useMemo(() => {
    const total      = atividadesComDesvio.length
    const conc       = atividadesComDesvio.filter(a => a.statusDesvio === 'concluida').length
    const atrasadas  = atividadesComDesvio.filter(a => a.statusDesvio === 'atrasada').length
    const emRisco    = atividadesComDesvio.filter(a => a.statusDesvio === 'em_risco').length
    const adiant     = atividadesComDesvio.filter(a => a.statusDesvio === 'adiantada').length
    const percExec   = total ? Math.round(atividadesComDesvio.reduce((s, a) => s + (a.percentual_exec || 0), 0) / total) : 0
    const comPrazo   = atividadesComDesvio.filter(a => a.planejado !== null && a.statusDesvio !== 'concluida')
    const desvioMed  = comPrazo.length ? Math.round(comPrazo.reduce((s, a) => s + (a.desvio ?? 0), 0) / comPrazo.length) : null
    return { total, conc, atrasadas, emRisco, adiant, percExec, desvioMed }
  }, [atividadesComDesvio])

  const contPorStatus = useMemo(() => {
    const map: Record<string, number> = {}
    atividadesComDesvio.forEach(a => { map[a.statusDesvio] = (map[a.statusDesvio] || 0) + 1 })
    return map
  }, [atividadesComDesvio])

  // Monta árvore de estrutura
  const tree = useMemo(() =>
    buildTree(estruturaNos, atividades)
  , [estruturaNos, atividades])

  const atividadesSemEstrutura = useMemo(() =>
    atividades.filter(a => !a.estrutura_id)
  , [atividades])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            Dashboard PCP
          </h1>
          <p className="text-gray-500 text-sm mt-1">Estrutura da obra · desvios · cronograma</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-100">
            ← Executivo
          </Link>
          <button onClick={() => carregar(obraFiltro)} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-100">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>
      </div>

      {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{erro}</div>}

      {/* Filtro obra + toggle view */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Building2 className="h-4 w-4" /> Obra:
        </div>
        <select
          value={obraFiltro}
          onChange={e => trocarObra(e.target.value)}
          className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
        >
          {isGestor && <option value="todas">Todas as obras</option>}
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <span className="text-xs text-gray-400">{atividadesComDesvio.length} atividades</span>

        {/* Toggle árvore / tabela */}
        <div className="ml-auto flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('arvore')}
            className={clsx('px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors',
              viewMode === 'arvore' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            <GitBranch className="h-3.5 w-3.5" /> Estrutura
          </button>
          <button
            onClick={() => setViewMode('tabela')}
            className={clsx('px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors',
              viewMode === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Tabela
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total',      value: kpis.total,     icon: GitBranch,   color: 'bg-gray-100',    text: 'text-gray-600' },
          { label: 'Concluídas', value: kpis.conc,      icon: CheckCircle2,color: 'bg-teal-100',    text: 'text-teal-700' },
          { label: 'No prazo',   value: kpis.adiant + (contPorStatus['no_prazo'] || 0), icon: TrendingUp, color: 'bg-emerald-100', text: 'text-emerald-700' },
          { label: 'Em risco',   value: kpis.emRisco,   icon: AlertTriangle,color: kpis.emRisco > 0 ? 'bg-amber-100' : 'bg-gray-50', text: kpis.emRisco > 0 ? 'text-amber-700' : 'text-gray-400' },
          { label: 'Atrasadas',  value: kpis.atrasadas, icon: TrendingDown, color: kpis.atrasadas > 0 ? 'bg-red-100' : 'bg-gray-50', text: kpis.atrasadas > 0 ? 'text-red-700' : 'text-gray-400' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 flex items-center gap-3 ${k.color} border-transparent`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/60`}>
              <k.icon className={`h-4 w-4 ${k.text}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${k.text}`}>{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        {[
          { dot: 'bg-teal-500',    label: 'Concluída' },
          { dot: 'bg-blue-500',    label: 'No prazo' },
          { dot: 'bg-emerald-500', label: 'Adiantada' },
          { dot: 'bg-amber-400',   label: 'Em risco' },
          { dot: 'bg-red-500',     label: 'Atrasada' },
          { dot: 'bg-gray-300',    label: 'Não iniciada' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${l.dot}`} />
            {l.label}
          </div>
        ))}
        <span className="ml-2 text-gray-400">| barra = executado · traço = planejado</span>
      </div>

      {/* ── VIEW: ÁRVORE DE ESTRUTURA ──────────────────────────── */}
      {viewMode === 'arvore' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-blue-500" />
              Estrutura da Obra
              {obraFiltro === 'todas' && <span className="text-xs text-gray-400 font-normal ml-1">(selecione uma obra para ver a árvore)</span>}
            </h2>
            <div className="flex items-center gap-2">
              {tree.length > 0 && (
                <>
                  <button onClick={() => setExpandAllTree(true)}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                    <ChevronDown className="h-3.5 w-3.5" /> Expandir tudo
                  </button>
                  <button onClick={() => setExpandAllTree(false)}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" /> Recolher tudo
                  </button>
                </>
              )}
            </div>
            {kpis.desvioMed !== null && (
              <div className={clsx('flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold border',
                kpis.desvioMed > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                kpis.desvioMed < 0 ? 'bg-red-50 border-red-200 text-red-700' :
                'bg-gray-50 border-gray-200 text-gray-600'
              )}>
                {kpis.desvioMed > 0 ? <ArrowUpRight className="h-4 w-4" /> : kpis.desvioMed < 0 ? <ArrowDownRight className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                Desvio médio: {kpis.desvioMed > 0 ? '+' : ''}{kpis.desvioMed}%
              </div>
            )}
          </div>

          {obraFiltro === 'todas' ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <GitBranch className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              Selecione uma obra acima para visualizar a estrutura
            </div>
          ) : tree.length === 0 && atividadesSemEstrutura.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhuma atividade cadastrada para esta obra.
            </div>
          ) : (
            <div className="space-y-1">
              {tree.sort((a, b) => a.ordem - b.ordem).map(node => (
                <TreeNode key={node.id} node={node} depth={0} expandAll={expandAllTree} />
              ))}
              <AtividadesSemEstrutura atividades={atividadesSemEstrutura} />
            </div>
          )}
        </div>
      )}

      {/* ── VIEW: TABELA ───────────────────────────────────────── */}
      {viewMode === 'tabela' && (
        <>
          {/* Filtros de status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            {(['todos', 'atrasada', 'em_risco', 'no_prazo', 'adiantada', 'concluida', 'nao_iniciada'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFiltro(s)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium border transition-all',
                  statusFiltro === s
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : s === 'todos'
                    ? 'border-gray-300 bg-white text-gray-500 hover:border-gray-400'
                    : clsx(STATUS_COLOR[s as StatusDesvio], 'hover:opacity-80')
                )}
              >
                {s === 'todos' ? `Todos (${atividadesComDesvio.length})` : `${STATUS_LABEL[s as StatusDesvio]} (${contPorStatus[s] || 0})`}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Atividade</th>
                    <th className="text-left px-4 py-3 font-medium">Empreiteiro</th>
                    <th className="text-left px-4 py-3 font-medium">Prazo</th>
                    <th className="text-left px-4 py-3 font-medium w-40">Progresso</th>
                    <th className="text-center px-4 py-3 font-medium">Exec.</th>
                    <th className="text-center px-4 py-3 font-medium">Plan.</th>
                    <th className="text-center px-4 py-3 font-medium">Desvio</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {atividadesFiltradas.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhuma atividade encontrada</td></tr>
                  ) : atividadesFiltradas.map((a: any) => {
                    const diasFim = a.data_fim_prev
                      ? Math.round((new Date(a.data_fim_prev + 'T12:00:00').getTime() - Date.now()) / 86400000)
                      : null
                    return (
                      <tr key={a.id} className={clsx('hover:bg-gray-50 transition-colors',
                        a.statusDesvio === 'atrasada' && 'bg-red-50/50',
                        a.statusDesvio === 'em_risco'  && 'bg-amber-50/50',
                      )}>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="font-medium text-gray-900 truncate">{a.nome}</p>
                          {a.estrutura_obra?.nome && <p className="text-xs text-gray-400 truncate">{a.estrutura_obra.nome}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {a.empreiteiros?.razao_social
                            ? <span className="flex items-center gap-1 text-xs text-gray-700"><HardHat className="h-3 w-3 text-gray-400 shrink-0" />{a.empreiteiros.razao_social}</span>
                            : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {a.data_fim_prev ? (
                            <div>
                              <p className="text-xs text-gray-500">{new Date(a.data_fim_prev + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                              {a.statusDesvio !== 'concluida' && diasFim !== null && (
                                <p className={clsx('text-xs font-medium', diasFim < 0 ? 'text-red-500' : diasFim < 7 ? 'text-amber-500' : 'text-gray-400')}>
                                  {diasFim < 0 ? `${Math.abs(diasFim)}d atrasado` : diasFim === 0 ? 'Hoje!' : `${diasFim}d`}
                                </p>
                              )}
                            </div>
                          ) : <span className="text-xs text-gray-400">Sem prazo</span>}
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <ProgressDual exec={a.percentual_exec || 0} planejado={a.planejado} color={BAR_COLOR[a.statusDesvio as StatusDesvio]} />
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-800">{a.percentual_exec || 0}%</td>
                        <td className="px-4 py-3 text-center text-gray-500">{a.planejado !== null ? `${a.planejado}%` : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {a.desvio !== null ? (
                            <span className={clsx('font-bold flex items-center justify-center gap-0.5',
                              a.desvio > 0 ? 'text-emerald-600' : a.desvio < 0 ? 'text-red-600' : 'text-gray-400'
                            )}>
                              {a.desvio > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : a.desvio < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                              {a.desvio > 0 ? '+' : ''}{a.desvio}%
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', STATUS_COLOR[a.statusDesvio as StatusDesvio])}>
                            {STATUS_LABEL[a.statusDesvio as StatusDesvio]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {atividadesFiltradas.length > 0 && (
              <div className="flex justify-end px-5 py-3 border-t border-gray-100">
                <Link href="/pcp" className="text-xs text-blue-500 hover:underline">Gerenciar PCP →</Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
