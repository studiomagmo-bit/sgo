'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { portalApi } from '@/lib/sgoApi'
import {
  Calendar, ChevronLeft, ChevronRight, Check,
  Users, Building2, GitBranch, Loader2, HardHat, LogOut,
  CheckCircle2, XCircle, FileText, Clock,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { toast } from 'sonner'

type Status = 'presente' | 'falta' | 'atestado' | 'folga'

const STATUS_CFG: Record<Status, { label: string; icon: any; bg: string; text: string; border: string }> = {
  presente: { label: 'Presente',  icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  falta:    { label: 'Falta',     icon: XCircle,      bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-300'     },
  atestado: { label: 'Atestado',  icon: FileText,     bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-300'    },
  folga:    { label: 'Folga',     icon: Clock,        bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-300'    },
}

function fmtDate(d: Date) { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function fmtDisplay(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function PresencaPortalPage() {
  const { portalUser, loadingPortal, logoutPortal } = usePortalAuth()
  const router = useRouter()

  const [data, setData]             = useState(fmtDate(new Date()))
  const [obras, setObras]           = useState<any[]>([])
  const [obraId, setObraId]         = useState('')
  const [colaboradores, setColab]   = useState<any[]>([])
  const [presenca, setPresenca]     = useState<Record<string, Status>>({})
  const [efetivoId, setEfetivoId]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    if (!loadingPortal && !portalUser) router.replace('/portal/login')
  }, [loadingPortal, portalUser, router])

  useEffect(() => {
    if (!portalUser) return
    Promise.all([
      portalApi.minhasObrasVinculadas(portalUser.empreiteiro_id),
      portalApi.meusColaboradores(portalUser.empreiteiro_id),
    ]).then(([obs, cols]) => {
      setObras(obs)
      setColab(cols)
      if (obs.length === 1) setObraId(obs[0].id)
    })
  }, [portalUser])

  const carregarPresenca = useCallback(async () => {
    if (!obraId || !portalUser || colaboradores.length === 0) return
    setLoading(true)
    try {
      const ef = await portalApi.buscarOuCriarEfetivo(
        obraId, portalUser.empreiteiro_id, data, portalUser.construtora_id
      )
      setEfetivoId(ef.id)
      const registros = await portalApi.listarPresenca(ef.id)
      const map: Record<string, Status> = {}
      // Inicializa todos como presente
      colaboradores.forEach(c => { map[c.id] = 'presente' })
      // Aplica os registros salvos (converte presente+motivo_ausencia → status)
      registros.forEach((r: any) => {
        if (r.status) {
          map[r.colaborador_id] = r.status as Status
        } else if (r.presente === false) {
          map[r.colaborador_id] = (r.motivo_ausencia as Status) || 'falta'
        } else {
          map[r.colaborador_id] = 'presente'
        }
      })
      setPresenca(map)
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar presença')
    } finally { setLoading(false) }
  }, [obraId, data, portalUser, colaboradores])

  useEffect(() => { carregarPresenca() }, [carregarPresenca])

  function toggleStatus(colabId: string) {
    const ordem: Status[] = ['presente', 'falta', 'atestado', 'folga']
    setPresenca(prev => {
      const atual = prev[colabId] ?? 'presente'
      const proximo = ordem[(ordem.indexOf(atual) + 1) % ordem.length]
      return { ...prev, [colabId]: proximo }
    })
  }

  async function salvar() {
    if (!efetivoId) { toast.error('Selecione a obra'); return }
    setSaving(true)
    try {
      const registros = colaboradores.map(c => {
        const s = presenca[c.id] ?? 'presente'
        return {
          efetivo_id:      efetivoId,
          colaborador_id:  c.id,
          presente:        s === 'presente',
          motivo_ausencia: s === 'falta' ? 'falta' : s === 'atestado' ? 'atestado' : s === 'folga' ? 'folga' : null,
          horas_trabalhadas: s === 'presente' ? 8 : 0,
        }
      })
      await portalApi.salvarPresenca(registros)
      toast.success('Presença salva!')
    } catch (err: any) { toast.error(err?.message ?? 'Erro') }
    finally { setSaving(false) }
  }

  if (loadingPortal || !portalUser) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  const nomeEmp = portalUser.empreiteiros?.nome_fantasia || portalUser.empreiteiros?.razao_social
  const presentes = Object.values(presenca).filter(s => s === 'presente').length
  const faltas    = Object.values(presenca).filter(s => s === 'falta').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500 flex items-center justify-center">
              <HardHat className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-900">{nomeEmp}</p>
          </div>
          <button onClick={() => { logoutPortal(); router.replace('/portal/login') }}
            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      <div className="pt-16 pb-28 max-w-2xl mx-auto px-4">
        <div className="py-4">
          <h1 className="text-xl font-bold text-gray-900">Presença</h1>
          <p className="text-sm text-gray-500">Registre a presença da sua equipe</p>
        </div>

        {/* Navegação de data */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
          <button onClick={() => setData(fmtDate(addDays(new Date(data + 'T12:00:00'), -1)))}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-900 capitalize">{fmtDisplay(data)}</p>
            {data === fmtDate(new Date()) && (
              <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5 font-medium">Hoje</span>
            )}
          </div>
          <button
            onClick={() => setData(fmtDate(addDays(new Date(data + 'T12:00:00'), 1)))}
            disabled={data >= fmtDate(new Date())}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Obra (só mostra se tiver mais de 1) */}
        {obras.length > 1 && (
          <select value={obraId} onChange={e => setObraId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 shadow-sm">
            <option value="">Selecione a obra...</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        )}
        {obras.length === 1 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4 text-sm text-blue-700 font-medium">
            <Building2 className="h-4 w-4 text-blue-500" />{obras[0].nome}
          </div>
        )}

        {/* Resumo */}
        {colaboradores.length > 0 && obraId && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(['presente','falta','atestado','folga'] as Status[]).map(s => {
              const cfg = STATUS_CFG[s]
              const count = Object.values(presenca).filter(v => v === s).length
              return (
                <div key={s} className={clsx('rounded-xl border p-3 text-center', cfg.bg, cfg.border)}>
                  <p className={clsx('text-xl font-bold', cfg.text)}>{count}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{cfg.label}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Legenda — toque para alternar */}
        {colaboradores.length > 0 && obraId && (
          <p className="text-xs text-gray-400 text-center mb-3">
            Toque no card para alternar: Presente → Falta → Atestado → Folga
          </p>
        )}

        {/* Lista de colaboradores */}
        {!obraId ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-400 text-sm shadow-sm">
            Selecione a obra para registrar presença
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : colaboradores.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Nenhum colaborador cadastrado.</p>
            <Link href="/portal/colaboradores" className="text-blue-500 text-sm hover:underline mt-1 inline-block">
              Cadastrar colaboradores →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {colaboradores.map(c => {
              const status = presenca[c.id] ?? 'presente'
              const cfg    = STATUS_CFG[status]
              const Icon   = cfg.icon
              return (
                <button key={c.id} onClick={() => toggleStatus(c.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98]',
                    cfg.bg, cfg.border
                  )}>
                  <div className={clsx('h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0',
                    status === 'presente' ? 'bg-emerald-100 text-emerald-700' :
                    status === 'falta'    ? 'bg-red-100 text-red-700' :
                    status === 'atestado' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {c.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.nome}</p>
                    <p className="text-xs text-gray-500">{c.funcao}</p>
                  </div>
                  <div className={clsx('flex items-center gap-1.5 rounded-full px-3 py-1.5 border shrink-0', cfg.bg, cfg.border, cfg.text)}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">{cfg.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Botão salvar fixo */}
      {colaboradores.length > 0 && obraId && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 z-30">
          <div className="max-w-2xl mx-auto">
            <button onClick={salvar} disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 shadow-lg shadow-blue-200 transition-all">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : <><Check className="h-5 w-5" />Salvar Presença — {presentes} presentes</>}
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
        {[
          { href:'/portal/home',         icon:Building2, label:'Início' },
          { href:'/portal/atividades',    icon:GitBranch, label:'Atividades' },
          { href:'/portal/colaboradores', icon:Users,     label:'Equipe' },
          { href:'/portal/presenca',      icon:Calendar,  label:'Presença' },
        ].map(item => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={clsx('flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                item.href.includes('presenca') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600')}>
              <Icon className="h-5 w-5" />{item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
