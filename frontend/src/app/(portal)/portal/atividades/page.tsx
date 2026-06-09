'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { portalApi } from '@/lib/sgoApi'
import {
  GitBranch, Building2, Users, LogOut, HardHat, RefreshCw, X, Check,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

const STATUS_OPTIONS = [
  { value: 'planejada',    label: 'Planejada' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida',    label: 'Concluída' },
  { value: 'bloqueada',    label: 'Bloqueada' },
]
const STATUS_BADGE: Record<string, string> = {
  planejada:    'bg-slate-800 text-slate-400 border-slate-600',
  em_andamento: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  concluida:    'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  bloqueada:    'bg-red-900/40 text-red-300 border-red-700/40',
  cancelada:    'bg-slate-800 text-slate-500 border-slate-600',
}

function AtividadesContent() {
  const { portalUser, loadingPortal, logoutPortal } = usePortalAuth()
  const router = useRouter()
  const params = useSearchParams()
  const obraParam = params.get('obra') ?? ''

  const [obras, setObras]         = useState<any[]>([])
  const [atividades, setAtividades] = useState<any[]>([])
  const [obraFiltro, setObraFiltro] = useState(obraParam)
  const [loading, setLoading]     = useState(false)
  const [editando, setEditando]   = useState<any>(null)
  const [form, setForm]           = useState({ status: '', percentual_exec: 0, notas_execucao: '' })
  const [salvando, setSalvando]   = useState(false)

  useEffect(() => {
    if (!loadingPortal && !portalUser) router.replace('/portal/login')
  }, [loadingPortal, portalUser, router])

  useEffect(() => {
    if (!portalUser) return
    portalApi.minhasObras(portalUser.empreiteiro_id).then(obs => {
      setObras(obs)
      if (!obraFiltro && obs.length === 1) setObraFiltro(obs[0].id)
    })
  }, [portalUser])

  useEffect(() => {
    if (!portalUser) return
    setLoading(true)
    portalApi.minhasAtividades(portalUser.empreiteiro_id, obraFiltro || undefined)
      .then(setAtividades).finally(() => setLoading(false))
  }, [portalUser, obraFiltro])

  async function salvarAtividade() {
    if (!editando) return
    setSalvando(true)
    try {
      const updated = await portalApi.atualizarAtividade(editando.id, form)
      setAtividades(p => p.map(a => a.id === editando.id ? { ...a, ...updated } : a))
      setEditando(null)
    } catch (e: any) { alert('Erro: ' + e.message) }
    finally { setSalvando(false) }
  }

  const hoje = new Date().toISOString().split('T')[0]
  const atrasadas = atividades.filter(a =>
    a.status !== 'concluida' && a.status !== 'cancelada' && a.data_fim_prev && a.data_fim_prev < hoje
  ).length

  if (loadingPortal || !portalUser) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center"><HardHat className="h-4 w-4 text-white" /></div>
          <div>
            <p className="text-sm font-bold text-white">Minhas Atividades</p>
            <p className="text-xs text-slate-400">{portalUser.empreiteiros?.razao_social}</p>
          </div>
        </div>
        <button onClick={() => { logoutPortal(); router.replace('/portal/login') }} className="text-red-400 p-2 rounded-lg hover:bg-red-900/20"><LogOut className="h-4 w-4" /></button>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-700 bg-slate-900">
        {[{ href: '/portal/home', label: 'Início', icon: Building2 }, { href: '/portal/presenca', label: 'Presença', icon: Users }, { href: '/portal/atividades', label: 'Atividades', icon: GitBranch }].map(item => {
          const Icon = item.icon
          return <Link key={item.href} href={item.href} className={clsx('flex-1 flex flex-col items-center gap-1 py-3 text-xs', item.href.includes('atividades') ? 'text-blue-400' : 'text-slate-500')}><Icon className="h-5 w-5" />{item.label}</Link>
        })}
      </nav>

      <main className="pt-16 pb-24 px-4 max-w-2xl mx-auto space-y-4">
        <div className="pt-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Atividades</h1>
            <p className="text-slate-400 text-sm">{atividades.length} total{atrasadas > 0 && <span className="text-red-400 ml-1">· {atrasadas} atrasada{atrasadas !== 1 ? 's' : ''}</span>}</p>
          </div>
          <select value={obraFiltro} onChange={e => setObraFiltro(e.target.value)} className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none">
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-800 animate-pulse" />)}</div>
        ) : atividades.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-10 text-center">
            <GitBranch className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nenhuma atividade vinculada a você.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atividades.map(a => {
              const diasFim = a.data_fim_prev ? Math.round((new Date(a.data_fim_prev + 'T12:00:00').getTime() - Date.now()) / 86400000) : null
              const atrasada = a.status !== 'concluida' && a.status !== 'cancelada' && a.data_fim_prev && a.data_fim_prev < hoje
              return (
                <div key={a.id} className={clsx('rounded-xl border bg-slate-800/60 p-4', atrasada ? 'border-red-800/50' : 'border-slate-700')}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">{a.nome}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{a.obras?.nome}{a.estrutura_obra?.nome && ` · ${a.estrutura_obra.nome}`}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_BADGE[a.status] || STATUS_BADGE.planejada)}>
                      {STATUS_OPTIONS.find(s => s.value === a.status)?.label || a.status}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5 mb-3">
                    <div className={clsx('h-1.5 rounded-full', a.status === 'concluida' ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${a.percentual_exec ?? 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={clsx('text-xs font-medium', atrasada ? 'text-red-400' : diasFim !== null && diasFim < 7 ? 'text-yellow-400' : 'text-slate-500')}>
                      {atrasada ? `${Math.abs(diasFim!)}d atrasado` : diasFim === 0 ? 'Hoje!' : diasFim !== null && a.data_fim_prev ? `${diasFim}d restantes` : `${a.percentual_exec ?? 0}%`}
                    </span>
                    <button onClick={() => { setEditando(a); setForm({ status: a.status, percentual_exec: a.percentual_exec ?? 0, notas_execucao: a.notas_execucao ?? '' }) }}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 border border-blue-600/40 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-600/30">
                      Atualizar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="font-semibold text-white text-sm truncate pr-4">{editando.nome}</h3>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => setForm(f => ({ ...f, status: s.value, percentual_exec: s.value === 'concluida' ? 100 : f.percentual_exec }))}
                    className={clsx('rounded-lg px-3 py-2 text-sm font-medium border', form.status === s.value ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300')}>
                    {s.label}
                  </button>
                ))}
              </div>
              <div>
                <div className="flex justify-between mb-1"><span className="text-xs text-slate-400">% Executado</span><span className="text-lg font-bold text-blue-400">{form.percentual_exec}%</span></div>
                <input type="range" min={0} max={100} step={5} value={form.percentual_exec} onChange={e => setForm(f => ({ ...f, percentual_exec: Number(e.target.value) }))} className="w-full accent-blue-500" />
              </div>
              <textarea rows={2} value={form.notas_execucao} onChange={e => setForm(f => ({ ...f, notas_execucao: e.target.value }))} placeholder="Observações..." className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none" />
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-slate-700">
              <button onClick={() => setEditando(null)} className="flex-1 rounded-lg bg-slate-700 px-4 py-2.5 text-sm text-slate-300">Cancelar</button>
              <button onClick={salvarAtividade} disabled={salvando} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                {salvando ? <><RefreshCw className="h-4 w-4 animate-spin" />Salvando...</> : <><Check className="h-4 w-4" />Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PortalAtividadesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    }>
      <AtividadesContent />
    </Suspense>
  )
}
