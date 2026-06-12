'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { portalApi } from '@/lib/sgoApi'
import {
  HardHat, Building2, GitBranch, Users, LogOut,
  CheckCircle2, Clock, AlertTriangle, Play,
  Flag, TrendingDown, Calendar, ChevronRight, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

const hoje = () => new Date().toISOString().split('T')[0]

const STATUS_CFG: Record<string, { label: string; dot: string; text: string }> = {
  planejada:           { label: 'Planejada',         dot: 'bg-gray-400',   text: 'text-gray-500' },
  em_andamento:        { label: 'Em andamento',      dot: 'bg-blue-500',   text: 'text-blue-700' },
  impedida:            { label: 'Impedida',           dot: 'bg-red-500',    text: 'text-red-600'  },
  pendente_validacao:  { label: 'Aguard. validação', dot: 'bg-amber-400',  text: 'text-amber-700' },
  concluida:           { label: 'Concluída',          dot: 'bg-teal-500',   text: 'text-teal-700' },
  reprovada:           { label: 'Reprovada',          dot: 'bg-red-600',    text: 'text-red-700'  },
  bloqueada:           { label: 'Bloqueada',          dot: 'bg-orange-400', text: 'text-orange-600' },
}

export default function PortalHomePage() {
  const { portalUser, loadingPortal, logoutPortal } = usePortalAuth()
  const router = useRouter()

  const [obras, setObras]           = useState<any[]>([])
  const [atividades, setAtividades] = useState<any[]>([])
  const [colaboradores, setColab]   = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!loadingPortal && !portalUser) router.replace('/portal/login')
  }, [loadingPortal, portalUser, router])

  useEffect(() => {
    if (!portalUser) return
    const empId = portalUser.empreiteiro_id
    Promise.all([
      portalApi.minhasObrasVinculadas(empId),
      portalApi.minhasAtividades(empId),
      portalApi.meusColaboradores(empId),
    ]).then(([obs, ativs, cols]) => {
      setObras(obs)
      setAtividades(ativs)
      setColab(cols)
    }).finally(() => setLoading(false))
  }, [portalUser])

  if (loadingPortal || !portalUser) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  const hj = hoje()
  const emAndamento      = atividades.filter(a => a.status === 'em_andamento').length
  const pendValidacao    = atividades.filter(a => a.status === 'pendente_validacao').length
  const reprovadas       = atividades.filter(a => a.status === 'reprovada').length
  const impedidas        = atividades.filter(a => a.status === 'impedida').length
  const concluidas       = atividades.filter(a => a.status === 'concluida').length
  const atrasadas        = atividades.filter(a =>
    !['concluida','cancelada'].includes(a.status) && a.data_fim_prev && a.data_fim_prev < hj
  ).length
  const percMedio        = atividades.length
    ? Math.round(atividades.reduce((s, a) => s + (a.percentual_exec || 0), 0) / atividades.length) : 0

  const nomeEmp = portalUser.empreiteiros?.nome_fantasia || portalUser.empreiteiros?.razao_social || 'Empreiteiro'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{nomeEmp}</p>
              <p className="text-xs text-gray-400 leading-tight">{portalUser.nome}</p>
            </div>
          </div>
          <button onClick={() => { logoutPortal(); router.replace('/portal/login') }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      <div className="pt-16 pb-24 max-w-2xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : (
          <div className="space-y-5 pt-5">

            {/* Alertas urgentes */}
            {(pendValidacao > 0 || reprovadas > 0 || impedidas > 0) && (
              <div className="space-y-2">
                {reprovadas > 0 && (
                  <Link href="/portal/atividades" className="flex items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3.5">
                    <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-red-700 text-lg">{reprovadas}</p>
                      <p className="text-sm text-red-600 font-medium">Atividade(s) reprovada(s) — veja o que corrigir</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-red-400" />
                  </Link>
                )}
                {impedidas > 0 && (
                  <Link href="/portal/atividades" className="flex items-center gap-3 rounded-2xl border-2 border-orange-300 bg-orange-50 px-4 py-3.5">
                    <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-orange-700 text-lg">{impedidas}</p>
                      <p className="text-sm text-orange-600 font-medium">Impedimento(s) registrado(s)</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-orange-400" />
                  </Link>
                )}
                {pendValidacao > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3.5">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <Flag className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-700 text-lg">{pendValidacao}</p>
                      <p className="text-sm text-amber-600 font-medium">Aguardando aprovação do engenheiro</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Em andamento', value: emAndamento,  icon: Play,         color: 'text-blue-600',   bg: 'bg-blue-50' },
                { label: 'Concluídas',   value: concluidas,   icon: CheckCircle2, color: 'text-teal-600',   bg: 'bg-teal-50' },
                { label: 'Atrasadas',    value: atrasadas,    icon: TrendingDown, color: atrasadas > 0 ? 'text-red-600' : 'text-gray-400',  bg: atrasadas > 0 ? 'bg-red-50' : 'bg-gray-50' },
                { label: 'Execução',     value: `${percMedio}%`, icon: GitBranch, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              ].map(k => (
                <div key={k.label} className={`rounded-2xl border border-transparent ${k.bg} p-4 flex items-center gap-3`}>
                  <div className="h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
                    <k.icon className={`h-5 w-5 ${k.color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                    <p className="text-xs text-gray-500">{k.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Ações rápidas */}
            <div className="grid grid-cols-3 gap-3">
              <Link href="/portal/atividades"
                className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm hover:shadow-md transition-all">
                <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <GitBranch className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-xs font-semibold text-gray-700">Atividades</span>
                <span className="text-xs text-gray-400">{atividades.length} total</span>
              </Link>
              <Link href="/portal/colaboradores"
                className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm hover:shadow-md transition-all">
                <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-gray-700">Colaboradores</span>
                <span className="text-xs text-gray-400">{colaboradores.length} ativos</span>
              </Link>
              <Link href="/portal/presenca"
                className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm hover:shadow-md transition-all">
                <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <span className="text-xs font-semibold text-gray-700">Presença</span>
                <span className="text-xs text-gray-400">Hoje</span>
              </Link>
            </div>

            {/* Obras vinculadas */}
            {obras.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-500" /> Minhas Obras
                  </h3>
                </div>
                {obras.map(o => {
                  const atsObra  = atividades.filter(a => a.obra_id === o.id)
                  const concObra = atsObra.filter(a => a.status === 'concluida').length
                  const percObra = atsObra.length
                    ? Math.round(atsObra.reduce((s, a) => s + (a.percentual_exec || 0), 0) / atsObra.length) : 0
                  return (
                    <div key={o.id} className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 last:border-0">
                      <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-lg shrink-0">
                        {o.nome?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm">{o.nome}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${percObra}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{percObra}%</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-800">{concObra}/{atsObra.length}</p>
                        <p className="text-xs text-gray-400">atividades</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Últimas atividades */}
            {atividades.filter(a => ['em_andamento','reprovada','impedida'].includes(a.status)).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" /> Em andamento
                  </h3>
                  <Link href="/portal/atividades" className="text-xs text-blue-500 hover:underline">Ver todas →</Link>
                </div>
                {atividades.filter(a => ['em_andamento','reprovada','impedida'].includes(a.status))
                  .slice(0, 5).map(a => {
                    const s = STATUS_CFG[a.status] ?? STATUS_CFG.planejada
                    return (
                      <Link href="/portal/atividades" key={a.id}
                        className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.nome}</p>
                          {a.obras?.nome && <p className="text-xs text-gray-400">{a.obras.nome}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${a.percentual_exec || 0}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-7">{a.percentual_exec || 0}%</span>
                        </div>
                      </Link>
                    )
                  })}
              </div>
            )}

            {/* Empty state */}
            {atividades.length === 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
                <GitBranch className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 text-sm font-medium">Nenhuma atividade vinculada</p>
                <p className="text-gray-400 text-xs mt-1">O engenheiro irá vincular atividades à sua empresa em breve.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
        {[
          { href: '/portal/home',          icon: Building2, label: 'Início' },
          { href: '/portal/atividades',     icon: GitBranch, label: 'Atividades' },
          { href: '/portal/colaboradores',  icon: Users,     label: 'Equipe' },
          { href: '/portal/presenca',       icon: Calendar,  label: 'Presença' },
        ].map(item => {
          const Icon = item.icon
          const active = typeof window !== 'undefined' && window.location.pathname.includes(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={clsx('flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600')}>
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
