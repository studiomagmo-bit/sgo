'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { portalApi } from '@/lib/sgoApi'
import {
  Users, CheckCircle2, XCircle, Save, RefreshCw,
  Building2, CalendarDays, LogOut, HardHat, GitBranch,
  Clock, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

const MOTIVOS = [
  { value: 'atestado', label: 'Atestado' },
  { value: 'falta_justificada', label: 'Falta justificada' },
  { value: 'falta_injustificada', label: 'Falta injustificada' },
  { value: 'folga', label: 'Folga' },
  { value: 'ferias', label: 'Férias' },
  { value: 'demissao', label: 'Demissão' },
  { value: 'outro', label: 'Outro' },
]

function hoje() { return new Date().toISOString().split('T')[0] }

export default function PortalPresencaPage() {
  const { portalUser, loadingPortal, logoutPortal } = usePortalAuth()
  const router = useRouter()

  const [obras, setObras] = useState<any[]>([])
  const [obraId, setObraId] = useState('')
  const [data, setData] = useState(hoje())
  const [efetivo, setEfetivo] = useState<any>(null)
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [presencas, setPresencas] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!loadingPortal && !portalUser) router.replace('/portal/login')
  }, [loadingPortal, portalUser, router])

  useEffect(() => {
    if (!portalUser) return
    portalApi.minhasObras(portalUser.empreiteiro_id).then(obs => {
      setObras(obs)
      if (obs.length === 1) setObraId(obs[0].id)
    })
  }, [portalUser])

  useEffect(() => {
    if (!obraId || !portalUser) return
    carregarPresenca()
  }, [obraId, data, portalUser])

  async function carregarPresenca() {
    setLoading(true)
    setErro('')
    setSalvo(false)
    try {
      const ef = await portalApi.buscarOuCriarEfetivo(obraId, portalUser!.empreiteiro_id, data, portalUser!.construtora_id)
      setEfetivo(ef)
      const [cols, presExist] = await Promise.all([
        portalApi.meusColaboradores(portalUser!.empreiteiro_id),
        portalApi.listarPresenca(ef.id),
      ])
      setColaboradores(cols)
      const map: Record<string, any> = {}
      presExist.forEach((p: any) => { map[p.colaborador_id] = p })
      const init: Record<string, any> = {}
      cols.forEach((c: any) => {
        init[c.id] = map[c.id] ?? { presente: true, motivo_ausencia: '', horas_trabalhadas: 8, observacao: '' }
      })
      setPresencas(init)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: string) {
    setPresencas(p => ({ ...p, [id]: { ...p[id], presente: !p[id].presente, motivo_ausencia: '' } }))
  }

  function set(id: string, campo: string, val: any) {
    setPresencas(p => ({ ...p, [id]: { ...p[id], [campo]: val } }))
  }

  async function salvar() {
    if (!efetivo) return
    setSalvando(true)
    setErro('')
    try {
      const registros = colaboradores.map(c => ({
        efetivo_id: efetivo.id,
        colaborador_id: c.id,
        presente: presencas[c.id]?.presente ?? true,
        motivo_ausencia: presencas[c.id]?.presente ? null : (presencas[c.id]?.motivo_ausencia || null),
        horas_trabalhadas: presencas[c.id]?.presente ? (presencas[c.id]?.horas_trabalhadas ?? 8) : 0,
        observacao: presencas[c.id]?.observacao || null,
      }))
      await portalApi.salvarPresenca(registros)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const presentes = colaboradores.filter(c => presencas[c.id]?.presente).length
  const ausentes  = colaboradores.length - presentes
  const horas     = colaboradores.filter(c => presencas[c.id]?.presente).reduce((s, c) => s + Number(presencas[c.id]?.horas_trabalhadas || 8), 0)

  if (loadingPortal || !portalUser) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-blue-500" /></div>

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center"><HardHat className="h-4 w-4 text-white" /></div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Presença Diária</p>
            <p className="text-xs text-slate-400">{portalUser.empreiteiros?.razao_social}</p>
          </div>
        </div>
        <button onClick={() => { logoutPortal(); router.replace('/portal/login') }} className="text-red-400 hover:bg-red-900/20 rounded-lg p-2"><LogOut className="h-4 w-4" /></button>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t border-slate-700 bg-slate-900">
        {[{ href: '/portal/home', label: 'Início', icon: Building2 }, { href: '/portal/presenca', label: 'Presença', icon: Users }, { href: '/portal/atividades', label: 'Atividades', icon: GitBranch }].map(item => {
          const Icon = item.icon
          const active = item.href.includes('presenca')
          return <Link key={item.href} href={item.href} className={clsx('flex-1 flex flex-col items-center gap-1 py-3 text-xs', active ? 'text-blue-400' : 'text-slate-500')}><Icon className="h-5 w-5" />{item.label}</Link>
        })}
      </nav>

      <main className="pt-16 pb-24 px-4 max-w-lg mx-auto space-y-4">
        <div className="pt-4">
          <h1 className="text-xl font-bold text-white">Presença Diária</h1>
          <p className="text-slate-400 text-sm">Marque quem está presente hoje</p>
        </div>

        {/* Filtros */}
        <div className="space-y-2">
          <select value={obraId} onChange={e => setObraId(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
            <option value="">Selecionar obra...</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>

        {erro && <div className="rounded-lg bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300 flex gap-2"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{erro}</div>}

        {!obraId && <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center"><Building2 className="h-8 w-8 text-slate-600 mx-auto mb-2" /><p className="text-slate-500 text-sm">Selecione uma obra</p></div>}

        {loading && obraId && <div className="text-slate-400 text-sm animate-pulse flex gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Carregando colaboradores...</div>}

        {!loading && obraId && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-900/20 border border-emerald-700/40 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-300">{presentes}</p>
                <p className="text-xs text-slate-400 mt-0.5">Presentes</p>
              </div>
              <div className="rounded-xl bg-red-900/20 border border-red-700/40 p-3 text-center">
                <p className="text-2xl font-bold text-red-300">{ausentes}</p>
                <p className="text-xs text-slate-400 mt-0.5">Ausentes</p>
              </div>
              <div className="rounded-xl bg-blue-900/20 border border-blue-700/40 p-3 text-center">
                <p className="text-2xl font-bold text-blue-300">{horas}h</p>
                <p className="text-xs text-slate-400 mt-0.5">Total hrs</p>
              </div>
            </div>

            {colaboradores.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center">
                <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nenhum colaborador cadastrado.</p>
                <p className="text-slate-600 text-xs mt-1">Fale com o gestor para cadastrá-los.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {colaboradores.map(c => {
                  const p = presencas[c.id] ?? { presente: true }
                  return (
                    <div key={c.id} className={clsx('rounded-xl border p-4', p.presente ? 'border-slate-700 bg-slate-800/60' : 'border-red-800/40 bg-red-900/10')}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggle(c.id)} className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all', p.presente ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-red-500 bg-red-500/20 text-red-400')}>
                          {p.presente ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </button>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{c.nome}</p>
                          {c.funcao && <p className="text-xs text-slate-400">{c.funcao}</p>}
                        </div>
                        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium border', p.presente ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' : 'bg-red-900/40 text-red-300 border-red-700/40')}>
                          {p.presente ? 'Presente' : 'Ausente'}
                        </span>
                      </div>
                      {p.presente ? (
                        <div className="mt-3 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <label className="text-xs text-slate-400">Horas:</label>
                          <input type="number" min={0} max={24} step={0.5} value={p.horas_trabalhadas ?? 8} onChange={e => set(c.id, 'horas_trabalhadas', Number(e.target.value))} className="w-16 rounded bg-slate-700 border border-slate-600 px-2 py-0.5 text-xs text-white text-center focus:outline-none" />
                          <span className="text-xs text-slate-500">h</span>
                        </div>
                      ) : (
                        <select value={p.motivo_ausencia ?? ''} onChange={e => set(c.id, 'motivo_ausencia', e.target.value)} className="mt-3 w-full rounded-lg bg-slate-700 border border-slate-600 px-2 py-1.5 text-xs text-white focus:outline-none">
                          <option value="">Motivo da ausência...</option>
                          {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {colaboradores.length > 0 && (
              <button onClick={salvar} disabled={salvando} className={clsx('w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-60', salvo ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}>
                {salvando ? <><RefreshCw className="h-4 w-4 animate-spin" />Salvando...</> : salvo ? <><CheckCircle2 className="h-4 w-4" />Salvo!</> : <><Save className="h-4 w-4" />Salvar Presença</>}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
