'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Users, Package, TrendingUp, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Stats { construtoras: number; usuarios: number; planos: number; ativas: number }

export default function AdminPage() {
  const [stats, setStats]     = useState<Stats>({ construtoras: 0, usuarios: 0, planos: 0, ativas: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [c, u, p, ca] = await Promise.all([
        supabase.from('construtoras').select('id', { count: 'exact', head: true }),
        supabase.from('usuarios').select('id', { count: 'exact', head: true }),
        supabase.from('planos').select('id', { count: 'exact', head: true }),
        supabase.from('construtoras').select('id', { count: 'exact', head: true }).eq('ativa', true),
      ])
      setStats({
        construtoras: c.count ?? 0,
        usuarios:     u.count ?? 0,
        planos:       p.count ?? 0,
        ativas:       ca.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Construtoras',       value: stats.construtoras, icon: Building2,   color: 'bg-blue-50 text-blue-700',   href: '/admin/construtoras' },
    { label: 'Construtoras Ativas', value: stats.ativas,      icon: TrendingUp,  color: 'bg-emerald-50 text-emerald-700', href: '/admin/construtoras' },
    { label: 'Usuários',           value: stats.usuarios,     icon: Users,       color: 'bg-violet-50 text-violet-700', href: '/admin/usuarios' },
    { label: 'Planos',             value: stats.planos,       icon: Package,     color: 'bg-orange-50 text-orange-700',  href: '/admin/planos' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
        <p className="text-slate-400 text-sm mt-1">Painel de administração do SGO SaaS</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(c => {
            const Icon = c.icon
            return (
              <Link key={c.label} href={c.href}
                className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-purple-500 transition-colors block">
                <div className={`inline-flex p-2 rounded-lg ${c.color} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-white">{c.value}</p>
                <p className="text-sm text-slate-400 mt-0.5">{c.label}</p>
              </Link>
            )
          })}
        </div>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/construtoras" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            + Nova Construtora
          </Link>
          <Link href="/admin/usuarios" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors">
            + Convidar Usuário
          </Link>
          <Link href="/admin/planos" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
            Gerenciar Planos
          </Link>
        </div>
      </div>
    </div>
  )
}
