'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { dashboard as dashboardApi, obras as obrasApi, estruturaObra } from '@/lib/sgoApi'
import { useAuth } from '@/contexts/auth'
import {
  BarChart3, CheckCircle2, Clock, TrendingDown, AlertTriangle,
  Loader2, Building2, HardHat, GitBranch, RefreshCw,
  ChevronRight, ChevronDown, ArrowUpRight, ArrowDownRight,
  Minus, Filter, Activity, Flag, X,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

// ── Tipos ──────────────────────────────────────────────────────
type Desvio = 'adiantada'|'no_prazo'|'em_risco'|'atrasada'|'nao_iniciada'|'concluida'|'sem_prazo'

function calcDesvio(a: any): { planejado: number|null; desvio: number|null; d: Desvio } {
  if (a.status === 'concluida') return { planejado: 100, desvio: null, d: 'concluida' }
  if (!a.data_inicio_prev || !a.data_fim_prev) return { planejado: null, desvio: null, d: 'sem_prazo' }
  const hoje  = new Date()
  const ini   = new Date(a.data_inicio_prev + 'T12:00:00')
  const fim   = new Date(a.data_fim_prev    + 'T12:00:00')
  if (hoje < ini) return { planejado: 0, desvio: a.percentual_exec || 0, d: 'nao_iniciada' }
  const total   = fim.getTime() - ini.getTime()
  const passado = hoje.getTime() - ini.getTime()
  const plan    = total <= 0 ? 100 : Math.min(100, Math.round((passado / total) * 100))
  const dev     = (a.percentual_exec || 0) - plan
  const d: Desvio = dev > 5 ? 'adiantada' : dev >= -5 ? 'no_prazo' : dev >= -25 ? 'em_risco' : 'atrasada'
  return { planejado: plan, desvio: dev, d }
}

const D_LABEL: Record<Desvio, string> = {
  adiantada:'Adiantada', no_prazo:'No prazo', em_risco:'Em risco',
  atrasada:'Atrasada', nao_iniciada:'Não iniciada', concluida:'Concluída', sem_prazo:'Sem prazo',
}
const D_CLS: Record<Desvio, string> = {
  adiantada:'bg-emerald-100 text-emerald-700 border-emerald-200',
  no_prazo:'bg-blue-100 text-blue-700 border-blue-200',
  em_risco:'bg-amber-100 text-amber-700 border-amber-200',
  atrasada:'bg-red-100 text-red-700 border-red-200',
  nao_iniciada:'bg-gray-100 text-gray-500 border-gray-200',
  concluida:'bg-teal-100 text-teal-700 border-teal-200',
  sem_prazo:'bg-gray-50 text-gray-400 border-gray-200',
}
const D_BAR: Record<Desvio, string> = {
  adiantada:'bg-emerald-500', no_prazo:'bg-blue-500', em_risco:'bg-amber-400',
  atrasada:'bg-red-500', nao_iniciada:'bg-gray-200', concluida:'bg-teal-500', sem_prazo:'bg-gray-200',
}

// ── Barra dupla ────────────────────────────────────────────────
function DualBar({ exec, plan, color }: { exec:number; plan:number|null; color:string }) {
  return (
    <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-visible">
      <div className={`absolute left-0 top-0 h-2 rounded-full ${color}`} style={{ width:`${Math.min(exec,100)}%` }} />
      {plan !== null && (
        <div className="absolute top-0 h-2 w-0.5 bg-gray-600/30" style={{ left:`${Math.min(plan,100)}%` }} />
      )}
    </div>
  )
}

// ── Nó da árvore de estrutura ──────────────────────────────────
interface TreeNode { id:string; nome:string; tipo:string; parent_id:string|null; ordem:number; children:TreeNode[]; atividades:any[] }

function buildTree(nos: any[], ativs: any[]): TreeNode[] {
  const map: Record<string,TreeNode> = {}
  nos.forEach(n => { map[n.id] = { ...n, children:[], atividades:[] } })
  ativs.forEach(a => { if (a.estrutura_id && map[a.estrutura_id]) map[a.estrutura_id].atividades.push(a) })
  const roots: TreeNode[] = []
  nos.forEach(n => {
    if (n.parent_id && map[n.parent_id]) map[n.parent_id].children.push(map[n.id])
    else roots.push(map[n.id])
  })
  return roots
}

function nodeStat(node: TreeNode) {
  const all: any[] = []
  function col(n: TreeNode) { n.atividades.forEach(a => all.push(a)); n.children.forEach(col) }
  col(node)
  return {
    total:    all.length,
    atras:    all.filter(a => calcDesvio(a).d === 'atrasada').length,
    risco:    all.filter(a => calcDesvio(a).d === 'em_risco').length,
    conc:     all.filter(a => calcDesvio(a).d === 'concluida').length,
  }
}

function TreeNodeRow({ node, depth=0, expandAll }: { node:TreeNode; depth?:number; expandAll?:boolean|null }) {
  const [open, setOpen] = useState(depth < 1)
  const stat = useMemo(() => nodeStat(node), [node])
  const hasKids = node.children.length > 0 || node.atividades.length > 0

  useEffect(() => {
    if (expandAll === true) setOpen(true)
    if (expandAll === false) setOpen(false)
  }, [expandAll])

  const bg = stat.atras > 0 ? 'border-red-200 bg-red-50/60'
    : stat.risco > 0 ? 'border-amber-200 bg-amber-50/60'
    : stat.conc === stat.total && stat.total > 0 ? 'border-teal-200 bg-teal-50/60'
    : stat.total > 0 ? 'border-blue-100 bg-blue-50/40'
    : 'border-gray-100 bg-gray-50/40'

  const dot = stat.atras > 0 ? 'bg-red-500' : stat.risco > 0 ? 'bg-amber-400'
    : stat.conc === stat.total && stat.total > 0 ? 'bg-teal-500'
    : stat.total > 0 ? 'bg-blue-500' : 'bg-gray-300'

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <button onClick={() => hasKids && setOpen(o => !o)}
        className={clsx('w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left mb-1 transition-all', bg, hasKids ? 'cursor-pointer hover:opacity-90' : 'cursor-default')}>
        <span className="w-4 shrink-0 text-gray-400">
          {hasKids && (open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}
        </span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{node.nome}</span>
        <span className="text-[10px] uppercase text-gray-400 shrink-0">{node.tipo}</span>
        {stat.total > 0 && (
          <div className="flex items-center gap-1 ml-1">
            {stat.atras > 0 && <span className="badge-vermelho">{stat.atras}↓</span>}
            {stat.risco > 0 && <span className="badge-amarelo">{stat.risco}!</span>}
            {stat.conc > 0  && <span className="badge-verde">{stat.conc}✓</span>}
            <span className="text-[10px] text-gray-400">{stat.total} atv.</span>
          </div>
        )}
      </button>

      {open && (
        <div className="border-l-2 border-gray-200 ml-5 pl-3 mb-2">
          {node.atividades.map(a => {
            const { d, planejado, desvio } = calcDesvio(a)
            return (
              <div key={a.id} className={clsx('flex items-center gap-2 rounded-lg border px-3 py-1.5 mb-1 text-xs',
                d === 'atrasada' ? 'border-red-200 bg-red-50' :
                d === 'em_risco' ? 'border-amber-100 bg-amber-50' :
                d === 'concluida' ? 'border-teal-100 bg-teal-50' : 'border-gray-100 bg-white')}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${D_BAR[d]}`} />
                <span className="flex-1 text-gray-800 truncate font-medium">{a.nome}</span>
                {a.empreiteiros?.razao_social && (
                  <span className="text-[10px] text-gray-400 hidden sm:block shrink-0 max-w-[100px] truncate">
                    {a.empreiteiros.razao_social}
                  </span>
                )}
                <div className="w-16 shrink-0">
                  <DualBar exec={a.percentual_exec||0} plan={planejado} color={D_BAR[d]} />
                </div>
                <span className="w-8 text-right font-bold text-gray-700">{a.percentual_exec||0}%</span>
                {desvio !== null && (
                  <span className={clsx('w-10 text-right font-bold',
                    desvio > 0 ? 'text-emerald-600' : desvio < 0 ? 'text-red-600' : 'text-gray-400')}>
                    {desvio > 0 ? '+':''}{desvio}%
                  </span>
                )}
              </div>
            )
          })}
          {node.children.sort((a,b) => a.ordem - b.ordem).map(c =>
            <TreeNodeRow key={c.id} node={c} depth={0} expandAll={expandAll} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Página ─────────────────────────────────────────────────────
type View = 'arvore' | 'tabela'

export default function PcpDashboardPage() {
  const { user } = useAuth()
  const isGestor = ['administrador','gerente'].includes((user as any)?.perfil ?? '')

  const [obras, setObras]           = useState<any[]>([])
  const [atividades, setAtividades] = useState<any[]>([])
  const [estruturaNos, setEstrNos]  = useState<any[]>([])
  const [obraFiltro, setObraFiltro] = useState('todas')
  const [statusFiltro, setStFiltro] = useState('todos')
  const [view, setView]             = useState<View>('arvore')
  const [loading, setLoading]       = useState(true)
  const [erro, setErro]             = useState('')
  const [expandAll, setExpandAll]   = useState<boolean|null>(null)

  const carregar = useCallback(async (obra_id?: string) => {
    setLoading(true)
    setErro('')
    try {
      const obraId = (!obra_id || obra_id === 'todas') ? undefined : obra_id
      // Carrega obras e atividades em paralelo — sem depender uma da outra
      const [obs, ativs] = await Promise.all([
        obrasApi.listar().catch(() => [] as any[]),
        dashboardApi.pcp(obraId).catch(() => [] as any[]),
      ])
      setObras(obs)
      setAtividades(ativs)
      // Estrutura só se obra específica — com fallback silencioso
      if (obraId) {
        estruturaObra.listar(obraId).then(setEstrNos).catch(() => setEstrNos([]))
      } else {
        setEstrNos([])
      }
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    obrasApi.listar()
      .then(obs => {
        const obraId = (!isGestor && obs.length >= 1) ? obs[0].id : undefined
        if (obraId) setObraFiltro(obraId)
        carregar(obraId)
      })
      .catch(() => carregar())
  }, []) // eslint-disable-line

  const ativsComDesvio = useMemo(() =>
    atividades.map(a => ({ ...a, ...calcDesvio(a) }))
  , [atividades])

  const ativsFiltradas = useMemo(() =>
    statusFiltro === 'todos' ? ativsComDesvio
    : ativsComDesvio.filter(a => a.d === statusFiltro)
  , [ativsComDesvio, statusFiltro])

  const kpis = useMemo(() => {
    const t    = ativsComDesvio.length
    const conc = ativsComDesvio.filter(a => a.d === 'concluida').length
    const atras= ativsComDesvio.filter(a => a.d === 'atrasada').length
    const risco= ativsComDesvio.filter(a => a.d === 'em_risco').length
    const adi  = ativsComDesvio.filter(a => a.d === 'adiantada').length
    const pm   = t ? Math.round(ativsComDesvio.reduce((s,a) => s+(a.percentual_exec||0),0)/t) : 0
    const comPlan = ativsComDesvio.filter(a => a.planejado !== null && a.d !== 'concluida')
    const devMed  = comPlan.length ? Math.round(comPlan.reduce((s,a) => s+(a.desvio??0),0)/comPlan.length) : null
    return { t, conc, atras, risco, adi, pm, devMed }
  }, [ativsComDesvio])

  const contPorD = useMemo(() => {
    const m: Record<string,number> = {}
    ativsComDesvio.forEach(a => { m[a.d] = (m[a.d]||0)+1 })
    return m
  }, [ativsComDesvio])

  const tree = useMemo(() => buildTree(estruturaNos, atividades), [estruturaNos, atividades])
  const semEstrutura = useMemo(() => atividades.filter(a => !a.estrutura_id), [atividades])

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" /> Dashboard PCP
          </h1>
          <p className="text-gray-500 text-sm mt-1">Estrutura · desvios · cronograma</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="btn-secondary text-xs">← Executivo</Link>
          <button onClick={() => carregar(obraFiltro === 'todas' ? undefined : obraFiltro)}
            className="btn-secondary text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm flex items-center justify-between">
          <span>⚠ {erro}</span>
          <button onClick={() => carregar(obraFiltro)} className="text-xs underline">Tentar novamente</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        {isGestor ? (
          <select value={obraFiltro} onChange={e => { setObraFiltro(e.target.value); carregar(e.target.value) }}
            className="select w-auto min-w-[200px]">
            <option value="todas">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        ) : obras[0] && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold text-blue-800">{obras[0].nome}</span>
          </div>
        )}
        <span className="text-xs text-gray-400">{ativsComDesvio.length} atividades</span>
        <div className="ml-auto flex rounded-xl border border-gray-200 overflow-hidden">
          {(['arvore','tabela'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx('px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors',
                view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
              {v === 'arvore' ? <><GitBranch className="h-3.5 w-3.5" />Estrutura</> : <><BarChart3 className="h-3.5 w-3.5" />Tabela</>}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l:'Total',       v:kpis.t,    c:'bg-gray-100',    t:'text-gray-700', i:GitBranch   },
          { l:'Concluídas',  v:kpis.conc, c:'bg-teal-100',    t:'text-teal-700', i:CheckCircle2 },
          { l:'No prazo',    v:kpis.adi+(contPorD['no_prazo']||0), c:'bg-emerald-100', t:'text-emerald-700', i:Activity },
          { l:'Em risco',    v:kpis.risco, c:kpis.risco>0?'bg-amber-100':'bg-gray-50', t:kpis.risco>0?'text-amber-700':'text-gray-400', i:AlertTriangle },
          { l:'Atrasadas',   v:kpis.atras, c:kpis.atras>0?'bg-red-100':'bg-gray-50',   t:kpis.atras>0?'text-red-700':'text-gray-400',   i:TrendingDown },
        ].map(k => (
          <div key={k.l} className={`rounded-xl border border-transparent ${k.c} p-4 flex items-center gap-3`}>
            <div className="h-9 w-9 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
              <k.i className={`h-4 w-4 ${k.t}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${k.t}`}>{k.v}</p>
              <p className="text-xs text-gray-500">{k.l}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap bg-gray-50 rounded-xl px-4 py-2.5">
        {(['concluida','no_prazo','adiantada','em_risco','atrasada','nao_iniciada'] as Desvio[]).map(d => (
          <div key={d} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${D_BAR[d]}`} />
            {D_LABEL[d]}
          </div>
        ))}
        <span className="text-gray-400 ml-1">| barra = executado · traço = planejado</span>
        {kpis.devMed !== null && (
          <span className={clsx('ml-auto font-semibold flex items-center gap-1',
            kpis.devMed > 0 ? 'text-emerald-600' : kpis.devMed < 0 ? 'text-red-600' : 'text-gray-500')}>
            {kpis.devMed > 0 ? <ArrowUpRight className="h-4 w-4"/> : kpis.devMed < 0 ? <ArrowDownRight className="h-4 w-4"/> : <Minus className="h-4 w-4"/>}
            Desvio médio: {kpis.devMed > 0?'+':''}{kpis.devMed}%
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-400">Carregando estrutura da obra...</p>
        </div>
      ) : (
        <>
          {/* ── VIEW ÁRVORE ─────────────────────────────────── */}
          {view === 'arvore' && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-blue-500" /> Estrutura da Obra
                  {obraFiltro === 'todas' && <span className="text-xs text-gray-400 font-normal">(selecione uma obra)</span>}
                </h2>
                {tree.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={() => setExpandAll(true)} className="btn-secondary text-xs py-1.5">
                      <ChevronDown className="h-3.5 w-3.5" /> Expandir
                    </button>
                    <button onClick={() => setExpandAll(false)} className="btn-secondary text-xs py-1.5">
                      <ChevronRight className="h-3.5 w-3.5" /> Recolher
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4">
                {obraFiltro === 'todas' ? (
                  <div className="text-center py-8 text-gray-400">
                    <GitBranch className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                    Selecione uma obra para ver a estrutura
                  </div>
                ) : tree.length === 0 && semEstrutura.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Nenhuma atividade cadastrada para esta obra.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {tree.sort((a,b) => a.ordem-b.ordem).map(n =>
                      <TreeNodeRow key={n.id} node={n} depth={0} expandAll={expandAll} />
                    )}
                    {/* Sem estrutura */}
                    {semEstrutura.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-400 mb-2">Sem localização na estrutura ({semEstrutura.length})</p>
                        {semEstrutura.map(a => {
                          const { d, planejado, desvio } = calcDesvio(a)
                          return (
                            <div key={a.id} className={clsx('flex items-center gap-2 rounded-lg border px-3 py-1.5 mb-1 text-xs ml-4',
                              d==='atrasada'?'border-red-200 bg-red-50':d==='em_risco'?'border-amber-100 bg-amber-50':'border-gray-100 bg-white')}>
                              <span className={`w-2 h-2 rounded-full ${D_BAR[d]}`} />
                              <span className="flex-1 truncate text-gray-800">{a.nome}</span>
                              <div className="w-16"><DualBar exec={a.percentual_exec||0} plan={planejado} color={D_BAR[d]} /></div>
                              <span className="font-bold w-8 text-right">{a.percentual_exec||0}%</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VIEW TABELA ──────────────────────────────────── */}
          {view === 'tabela' && (
            <>
              {/* Filtros por status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-gray-400" />
                {(['todos','atrasada','em_risco','no_prazo','adiantada','concluida','nao_iniciada'] as const).map(s => (
                  <button key={s} onClick={() => setStFiltro(s)}
                    className={clsx('rounded-full px-3 py-1 text-xs font-medium border transition-all',
                      statusFiltro === s ? 'bg-blue-600 border-blue-600 text-white'
                      : s==='todos' ? 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                      : clsx(D_CLS[s as Desvio], 'hover:opacity-80'))}>
                    {s==='todos' ? `Todos (${ativsComDesvio.length})` : `${D_LABEL[s as Desvio]} (${contPorD[s]||0})`}
                  </button>
                ))}
              </div>

              <div className="table-wrapper">
                <table className="table-base">
                  <thead>
                    <tr>
                      {['Atividade','Empreiteiro','Prazo','Progresso','Exec.','Plan.','Desvio','Status'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ativsFiltradas.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhuma atividade</td></tr>
                    ) : ativsFiltradas.map(a => {
                      const diasFim = a.data_fim_prev
                        ? Math.round((new Date(a.data_fim_prev+'T12:00:00').getTime()-Date.now())/86400000) : null
                      return (
                        <tr key={a.id} className={a.d==='atrasada'?'!bg-red-50/50':a.d==='em_risco'?'!bg-amber-50/50':''}>
                          <td>
                            <p className="font-semibold text-gray-900 truncate max-w-[160px]">{a.nome}</p>
                            {a.estrutura_obra?.nome && <p className="text-xs text-gray-400">{a.estrutura_obra.nome}</p>}
                          </td>
                          <td className="text-gray-600 text-xs max-w-[120px]">
                            {a.empreiteiros?.razao_social ?? <span className="text-gray-300">—</span>}
                          </td>
                          <td>
                            {a.data_fim_prev ? (
                              <>
                                <p className="text-xs text-gray-500">{new Date(a.data_fim_prev+'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                {a.d!=='concluida' && diasFim!==null && (
                                  <p className={clsx('text-xs font-medium',diasFim<0?'text-red-500':diasFim<7?'text-amber-500':'text-gray-400')}>
                                    {diasFim<0?`${Math.abs(diasFim)}d atras.`:diasFim===0?'Hoje!': `${diasFim}d`}
                                  </p>
                                )}
                              </>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="w-36"><DualBar exec={a.percentual_exec||0} plan={a.planejado} color={D_BAR[a.d as Desvio]} /></td>
                          <td className="text-center font-semibold text-gray-800">{a.percentual_exec||0}%</td>
                          <td className="text-center text-gray-500">{a.planejado!==null?`${a.planejado}%`:'—'}</td>
                          <td className="text-center">
                            {a.desvio!==null ? (
                              <span className={clsx('font-bold flex items-center justify-center gap-0.5 text-xs',
                                a.desvio>0?'text-emerald-600':a.desvio<0?'text-red-600':'text-gray-400')}>
                                {a.desvio>0?<ArrowUpRight className="h-3.5 w-3.5"/>:a.desvio<0?<ArrowDownRight className="h-3.5 w-3.5"/>:<Minus className="h-3.5 w-3.5"/>}
                                {a.desvio>0?'+':''}{a.desvio}%
                              </span>
                            ) : '—'}
                          </td>
                          <td>
                            <span className={clsx('badge border rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', D_CLS[a.d as Desvio])}>
                              {D_LABEL[a.d as Desvio]}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
