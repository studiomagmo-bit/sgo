'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { obras as obrasApi } from '@/lib/sgoApi'
import {
  Users, HardHat, Building2, Loader2, TrendingUp,
  CalendarDays, CheckCircle2, Clock, UserRound,
} from 'lucide-react'
import { clsx } from 'clsx'

function KpiCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
      <div className={clsx('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', bg)}>
        <Icon className={clsx('h-6 w-6', color)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  )
}

export default function EfetivoDashboardPage() {
  const [obras, setObras]           = useState<any[]>([])
  const [efetivos, setEfetivos]     = useState<any[]>([])
  const [empreiteiros, setEmp]      = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const hoje = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setLoading(true)
    Promise.all([
      obrasApi.listar(),
      supabase.from('efetivo_diario')
        .select('*, obras(nome), empreiteiros(razao_social), efetivo_colaboradores(id, presente)')
        .eq('data', hoje)
        .order('criado_em', { ascending: false }),
      supabase.from('empreiteiros')
        .select('id, razao_social, ativo')
        .eq('ativo', true)
        .order('razao_social'),
    ]).then(([ob, ef, emp]) => {
      setObras(ob)
      setEfetivos(ef.data ?? [])
      setEmp(emp.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  // Métricas
  const totalPresentes = efetivos.reduce((s, e) => {
    const pres = (e.efetivo_colaboradores ?? []).filter((c: any) => c.presente).length
    return s + pres
  }, 0)
  const totalRegistros = efetivos.length
  const obrasComEfetivo = new Set(efetivos.map(e => e.obra_id)).size
  const obrasAtivas = obras.filter(o => o.status === 'em_andamento').length

  // Agrupar registros por obra
  const porObra = obras.map(o => {
    const regs = efetivos.filter(e => e.obra_id === o.id)
    const presentes = regs.reduce((s, e) => s + (e.efetivo_colaboradores ?? []).filter((c: any) => c.presente).length, 0)
    const emps = regs.map(e => e.empreiteiros?.razao_social).filter(Boolean)
    return { ...o, regs, presentes, emps }
  }).filter(o => o.regs.length > 0 || o.status === 'em_andamento')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Efetivo Diário</h1>
            <p className="text-blue-100 text-sm mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Trabalhadores hoje"   value={totalPresentes}  icon={Users}       color="text-blue-600"    bg="bg-blue-100" />
            <KpiCard title="Obras com efetivo"    value={obrasComEfetivo} icon={Building2}   color="text-emerald-600" bg="bg-emerald-100" />
            <KpiCard title="Obras ativas"         value={obrasAtivas}     icon={TrendingUp}  color="text-indigo-600"  bg="bg-indigo-100" />
            <KpiCard title="Empreiteiros ativos"  value={empreiteiros.length} icon={HardHat} color="text-amber-600"   bg="bg-amber-100" />
          </div>

          {/* Por obra */}
          {porObra.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhum efetivo registrado hoje.</p>
              <p className="text-sm mt-1">Os empreiteiros registram a presença pelo portal próprio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {porObra.map(o => (
                <div key={o.id} className={clsx(
                  'rounded-2xl border bg-white p-5 shadow-sm',
                  o.presentes > 0 ? 'border-blue-100' : 'border-gray-100'
                )}>
                  {/* Obra header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{o.nome}</p>
                        <p className="text-xs text-gray-400">{o.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{o.presentes}</p>
                      <p className="text-xs text-gray-400">presentes</p>
                    </div>
                  </div>

                  {/* Empreiteiros com efetivo */}
                  {o.regs.length > 0 ? (
                    <div className="space-y-2">
                      {o.regs.map((reg: any) => {
                        const pres = (reg.efetivo_colaboradores ?? []).filter((c: any) => c.presente).length
                        const total = (reg.efetivo_colaboradores ?? []).length
                        return (
                          <div key={reg.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <HardHat className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-xs text-gray-700 font-medium">
                                {reg.empreiteiros?.razao_social ?? '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-500 h-1.5 rounded-full"
                                  style={{ width: total > 0 ? `${(pres / total) * 100}%` : '0%' }} />
                              </div>
                              <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                                {pres}/{total}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Sem efetivo registrado hoje</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Todos os empreiteiros */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <HardHat className="h-4 w-4 text-amber-500" /> Empreiteiros cadastrados
              </h2>
              <span className="text-xs text-gray-400">{empreiteiros.length} ativo{empreiteiros.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {empreiteiros.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhum empreiteiro cadastrado.</p>
              ) : empreiteiros.map(emp => {
                const temEfetivo = efetivos.some(e => e.empreiteiro_id === emp.id)
                const presHoje = efetivos
                  .filter(e => e.empreiteiro_id === emp.id)
                  .reduce((s, e) => s + (e.efetivo_colaboradores ?? []).filter((c: any) => c.presente).length, 0)
                return (
                  <div key={emp.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-amber-700">
                          {emp.razao_social.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{emp.razao_social}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {temEfetivo ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-1">
                          <CheckCircle2 className="h-3 w-3" /> {presHoje} hoje
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-1">
                          <Clock className="h-3 w-3" /> Sem registro
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
