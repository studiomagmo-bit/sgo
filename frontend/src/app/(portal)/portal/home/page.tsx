'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { portalApi } from '@/lib/sgoApi'
import {
  HardHat, Building2, GitBranch, Users, LogOut,
  CheckCircle2, Clock, AlertTriangle, TrendingUp,
  CalendarDays, ChevronRight, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

const STATUS_LABEL: Record<string, string> = {
  planejamento: 'Planejamento', em_andamento: 'Em andamento',
  pausada: 'Pausada', concluida: 'Concluída', cancelada: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  planejamento: 'text-yellow-400', em_andamento: 'text-blue-400',
  pausada: 'text-gray-400', concluida: 'text-emerald-400', cancelada: 'text-red-400',
}

export default function PortalHomePage() {
  const { portalUser, loadingPortal, logoutPortal } = usePortalAuth()
  const router = useRouter()

  const [obras, setObras] = useState<any[]>([])
  const [atividades, setAtividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loadingPortal && !portalUser) {
      router.replace('/portal/login')
    }
  }, [loadingPortal, portalUser, router])

  useEffect(() => {
    if (!portalUser) return
    Promise.all([
      portalApi.minhasObras(portalUser.empreiteiro_id),
      portalApi.minhasAtividades(portalUser.empreiteiro_id),
    ]).then(([obs, ativs]) => {
      setObras(obs)
      setAtividades(ativs)
    }).finally(() => setLoading(false))
  }, [portalUser])

  if (loadingPortal || !portalUser) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
  }

  const hoje = new Date().toISOString().split('T')[0]
  const concluidas  = atividades.filter(a => a.status === 'concluida').length
  const andamento   = atividades.filter(a => a.status === 'em_andamento').length
  const atrasadas   = atividades.filter(a => a.status !== 'concluida' && a.status !== 'cancelada' && a.data_fim_prev && a.data_fim_prev < hoje).length
  const percMedio   = atividades.length ? Math.round(atividades.reduce((s, a) => s + (a.percentual_exec || 0), 0) / atividades.length) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <HardHat className="h-4 w-4 text-gray-900" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Portal Empreiteiro</p>
            <p className="text-xs text-gray-400 leading-tight">{portalUser.empreiteiros?.razao_social || portalUser.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs text-gray-400">{portalUser.nome}</span>
          <button
            onClick={() => { logoutPortal(); router.replace('/portal/login') }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      {/* Nav inferior (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t border-gray-200 bg-gray-50">
        {[
          { href: '/portal/home',       label: 'Início',      icon: Building2 },
          { href: '/portal/presenca',   label: 'Presença',    icon: Users },
          { href: '/portal/atividades', label: 'Atividades',  icon: GitBranch },
        ].map(item => {
          const Icon = item.icon
          const isActive = typeof window !== 'undefined' && window.location.pathname.includes(item.href.split('/').pop()!)
          return (
            <Link key={item.href} href={item.href} className={clsx('flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors', isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-600')}>
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Conteúdo */}
      <main className="pt-16 pb-24 px-4 max-w-2xl mx-auto space-y-5">
        {/* Saudação */}
        <div className="pt-4">
          <h1 className="text-xl font-bold text-gray-900">Olá, {portalUser.nome.split(' ')[0]}! 👷</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* KPIs */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-white animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-900/50 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{obras.length}</p>
                <p className="text-xs text-gray-400">Obra{obras.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-teal-900/50 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{concluidas}</p>
                <p className="text-xs text-gray-400">Concluídas</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-yellow-900/50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{andamento}</p>
                <p className="text-xs text-gray-400">Em andamento</p>
              </div>
            </div>
            <div className={clsx('rounded-xl border bg-white p-3 flex items-center gap-3', atrasadas > 0 ? 'border-red-700/40' : 'border-gray-200')}>
              <div className={clsx('h-9 w-9 rounded-lg flex items-center justify-center', atrasadas > 0 ? 'bg-red-900/50' : 'bg-gray-100')}>
                <AlertTriangle className={clsx('h-4 w-4', atrasadas > 0 ? 'text-red-400' : 'text-gray-500')} />
              </div>
              <div>
                <p className={clsx('text-xl font-bold', atrasadas > 0 ? 'text-red-300' : 'text-gray-900')}>{atrasadas}</p>
                <p className="text-xs text-gray-400">Atrasadas</p>
              </div>
            </div>
          </div>
        )}

        {/* % Médio */}
        {!loading && atividades.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Progresso médio
              </span>
              <span className="text-lg font-bold text-blue-400">{percMedio}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${percMedio}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{atividades.length} atividades no total</p>
          </div>
        )}

        {/* Obras vinculadas */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" /> Suas Obras
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-16 rounded-xl bg-white animate-pulse" />)}
            </div>
          ) : obras.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-gray-500 text-sm">Nenhuma obra vinculada ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {obras.map((o: any) => {
                const qtdAtivs = atividades.filter(a => a.obra_id === o.id).length
                const diasFim  = o.data_fim_prev ? Math.round((new Date(o.data_fim_prev + 'T12:00:00').getTime() - Date.now()) / 86400000) : null
                return (
                  <Link
                    key={o.id}
                    href={`/portal/atividades?obra=${o.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{o.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={clsx('text-xs', STATUS_COLOR[o.status] || 'text-gray-400')}>
                          {STATUS_LABEL[o.status] || o.status}
                        </span>
                        <span className="text-gray-600 text-xs">·</span>
                        <span className="text-xs text-gray-500">{qtdAtivs} atividade{qtdAtivs !== 1 ? 's' : ''}</span>
                        {diasFim !== null && (
                          <>
                            <span className="text-gray-600 text-xs">·</span>
                            <span className={clsx('text-xs font-medium', diasFim < 0 ? 'text-red-400' : diasFim < 15 ? 'text-yellow-400' : 'text-gray-500')}>
                              {diasFim < 0 ? `${Math.abs(diasFim)}d atrasado` : `${diasFim}d`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Atalhos */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/portal/presenca" className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-100 transition-colors">
            <Users className="h-7 w-7 text-emerald-400" />
            <span className="text-sm font-medium text-gray-900">Registrar Presença</span>
            <span className="text-xs text-gray-500">Efetivo do dia</span>
          </Link>
          <Link href="/portal/atividades" className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-100 transition-colors">
            <GitBranch className="h-7 w-7 text-blue-400" />
            <span className="text-sm font-medium text-gray-900">Minhas Atividades</span>
            <span className="text-xs text-gray-500">{atrasadas > 0 ? `${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` : 'Ver PCP'}</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
