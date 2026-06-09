'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import {
  Building2, LayoutDashboard, GitBranch, Users, ClipboardList,
  HardHat, CheckCircle, AlertTriangle, DollarSign, Truck,
  BookOpen, LogOut, ChevronRight, Settings, Shield,
  UserRound, LayoutGrid, PieChart, BarChart3, UserCog,
} from 'lucide-react'
import { clsx } from 'clsx'

const nav = [
  { label: 'Dashboard',        icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Dashboard PCP',    icon: PieChart,        href: '/pcp-dashboard' },
  { label: 'Obras',            icon: Building2,       href: '/obras' },
  { divider: 'Planejamento' },
  { label: 'PCP / Atividades', icon: GitBranch,       href: '/pcp' },
  { label: 'Cronograma Gantt', icon: BarChart3,       href: '/pcp/gantt' },
  { label: 'Efetivo Diário',   icon: Users,           href: '/efetivo' },
  { label: 'Produções',        icon: ClipboardList,   href: '/producoes' },
  { divider: 'Qualidade' },
  { label: 'Inspeções',        icon: CheckCircle,     href: '/inspecoes' },
  { label: 'Pendências',       icon: AlertTriangle,   href: '/pendencias' },
  { divider: 'Recursos' },
  { label: 'Equipamentos',     icon: Truck,           href: '/equipamentos' },
  { divider: 'Comercial' },
  { label: 'Empreiteiros',     icon: HardHat,         href: '/empreiteiros' },
  { label: 'Colaboradores',    icon: UserRound,       href: '/colaboradores' },
  { label: 'Efetivo Geral',    icon: Users,           href: '/empreiteiro-portal' },
  { label: 'Medições',         icon: DollarSign,      href: '/medicoes' },
  { divider: 'Registros' },
  { label: 'Diário de Obra',   icon: BookOpen,        href: '/diario' },
  { divider: 'Configurações' },
  { label: 'Usuários',         icon: UserCog,         href: '/usuarios' },
  { label: 'Configurações',    icon: Settings,        href: '/configuracoes' },
]

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  administrador: { label: 'Gestor',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  gerente:       { label: 'Gerente',      color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  engenheiro:    { label: 'Engenheiro',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  mestre:        { label: 'Mestre',       color: 'bg-amber-100 text-amber-700 border-amber-200' },
  pcp:           { label: 'PCP',          color: 'bg-violet-100 text-violet-700 border-violet-200' },
  almoxarife:    { label: 'Almoxarife',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  superadmin:    { label: 'Super Admin',  color: 'bg-red-100 text-red-700 border-red-200' },
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const isSuperAdmin = (user as any)?.perfil_sistema === 'superadmin'
  const perfil       = (user as any)?.perfil_sistema === 'superadmin' ? 'superadmin' : (user?.perfil ?? 'engenheiro')
  const badge        = ROLE_BADGE[perfil] ?? { label: perfil, color: 'bg-gray-100 text-gray-600 border-gray-200' }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white border-r border-gray-200 shadow-sm">

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
          <Building2 className="h-5 w-5 text-gray-900" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">SGO</p>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Gestão de Obras</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {nav.map((item, idx) => {
          if ('divider' in item) {
            return (
              <p key={idx} className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {item.divider}
              </p>
            )
          }
          const Icon = item.icon!
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/pcp-dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx('sidebar-link', isActive && 'active')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && !item.href.startsWith('/pcp') && <ChevronRight className="h-3 w-3 shrink-0 opacity-70" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50/50">
        {/* User card */}
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white border border-gray-100 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">
            {user?.nome?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.nome || 'Usuário'}</p>
            <span className={clsx('inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-medium', badge.color)}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="sidebar-link w-full text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>

        {/* Admin */}
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="sidebar-link text-violet-600 hover:text-violet-800 hover:bg-violet-50"
          >
            <Shield className="h-4 w-4" />
            <span>Painel Admin</span>
          </Link>
        )}
      </div>
    </aside>
  )
}
