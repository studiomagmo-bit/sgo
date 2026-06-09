'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import Link from 'next/link'
import { Building2, Users, Package, LayoutDashboard, LogOut, ChevronRight, Shield } from 'lucide-react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

const adminNav = [
  { label: 'Visão Geral',   icon: LayoutDashboard, href: '/admin' },
  { label: 'Construtoras',  icon: Building2,        href: '/admin/construtoras' },
  { label: 'Usuários',      icon: Users,            href: '/admin/usuarios' },
  { label: 'Planos',        icon: Package,          href: '/admin/planos' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return }
    if (!loading && user && (user as any).perfil_sistema !== 'superadmin') {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
    </div>
  )
  if (!user || (user as any).perfil_sistema !== 'superadmin') return null

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar Admin */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-slate-900 border-r border-slate-700">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">SGO Admin</p>
            <p className="text-xs text-slate-400">Painel SuperAdmin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {adminNav.map(item => {
            const Icon    = item.icon
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-3 w-3" />}
              </Link>
            )
          })}

          {/* Voltar ao app */}
          <div className="pt-4 border-t border-slate-700 mt-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Voltar ao SGO
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700 p-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.nome?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.nome}</p>
              <p className="text-[10px] text-purple-400">superadmin</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-60 overflow-auto">
        <div className="min-h-screen p-6">{children}</div>
      </main>
    </div>
  )
}
