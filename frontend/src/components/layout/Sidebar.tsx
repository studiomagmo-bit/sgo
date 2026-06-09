'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import {
  Building2, LayoutDashboard, GitBranch, Users, ClipboardList,
  Wrench, Package, HardHat, CheckCircle, AlertTriangle,
  FileText, DollarSign, Truck, BookOpen, LogOut, ChevronRight,
  Settings, BarChart3, Shield,
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { label: 'Dashboard',      icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Obras',          icon: Building2,       href: '/obras' },
  { divider: 'Planejamento' },
  { label: 'PCP / Atividades', icon: GitBranch,     href: '/pcp' },
  { label: 'Efetivo Diário', icon: Users,            href: '/efetivo' },
  { label: 'Produções',      icon: ClipboardList,    href: '/producoes' },
  { divider: 'Qualidade' },
  { label: 'Inspeções',      icon: CheckCircle,      href: '/inspecoes' },
  { label: 'Pendências',     icon: AlertTriangle,    href: '/pendencias' },
  { divider: 'Recursos' },
  { label: 'Equipamentos',   icon: Truck,            href: '/equipamentos' },
  { divider: 'Comercial' },
  { label: 'Empreiteiros',   icon: HardHat,          href: '/empreiteiros' },
  { label: 'Medições',       icon: DollarSign,       href: '/medicoes' },
  { divider: 'Registros' },
  { label: 'Diário de Obra', icon: BookOpen,         href: '/diario' },
  { divider: 'Configurações' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const isSuperAdmin = (user as any)?.perfil_sistema === 'superadmin'

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 border-r border-slate-700">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">SGO</p>
          <p className="text-xs text-slate-400 truncate max-w-[140px]">
            {user?.nome || 'Usuário'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item, idx) => {
          if ('divider' in item) {
            return (
              <p key={idx} className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                {item.divider}
              </p>
            )
          }
          const Icon = item.icon!
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'sidebar-link',
                isActive && 'active'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 mb-1">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.nome?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.nome}</p>
            <p className="text-[10px] text-slate-400 truncate capitalize">{user?.perfil}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/30"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="sidebar-link text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 mt-1"
          >
            <Shield className="h-4 w-4" />
            Painel Admin
          </Link>
        )}
      </div>
    </aside>
  )
}
