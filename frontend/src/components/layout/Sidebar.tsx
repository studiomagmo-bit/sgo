'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import {
  Building2, LayoutDashboard, GitBranch, Users, ClipboardList,
  HardHat, CheckCircle, AlertTriangle, DollarSign, Truck,
  BookOpen, LogOut, Settings, Shield,
  UserRound, PieChart, BarChart3, UserCog, ChevronRight,
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

const ROLE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  administrador: { label: 'Gestor',      bg: 'bg-blue-600',    text: 'text-white' },
  gerente:       { label: 'Gerente',     bg: 'bg-indigo-600',  text: 'text-white' },
  engenheiro:    { label: 'Engenheiro',  bg: 'bg-emerald-600', text: 'text-white' },
  mestre:        { label: 'Mestre',      bg: 'bg-amber-500',   text: 'text-white' },
  pcp:           { label: 'PCP',         bg: 'bg-violet-600',  text: 'text-white' },
  almoxarife:    { label: 'Almoxarife',  bg: 'bg-orange-500',  text: 'text-white' },
  superadmin:    { label: 'Super Admin', bg: 'bg-red-600',     text: 'text-white' },
}

export function Sidebar() {
  const pathname  = usePathname()
  const { user, logout } = useAuth()
  const isSuperAdmin = (user as any)?.perfil_sistema === 'superadmin'
  const perfil       = isSuperAdmin ? 'superadmin' : ((user as any)?.perfil ?? 'engenheiro')
  const badge        = ROLE_BADGE[perfil] ?? { label: perfil, bg: 'bg-gray-500', text: 'text-white' }
  const inicial      = user?.nome?.charAt(0).toUpperCase() || 'U'

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white shadow-lg border-r border-gray-100">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-gray-900 tracking-tight">SGO</p>
          <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-widest">Gestão de Obras</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {nav.map((item, idx) => {
          if ('divider' in item) {
            return (
              <p key={idx} className="pt-4 pb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-300">
                {item.divider}
              </p>
            )
          }
          const Icon = item.icon!
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/pcp-dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700'
              )}
            >
              <Icon className={clsx('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-gray-400')} />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3 space-y-1.5">
        <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
          <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm', badge.bg, badge.text)}>
            {inicial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.nome || 'Usuário'}</p>
            <span className={clsx('inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold', badge.bg, badge.text)}>
              {badge.label}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-violet-500 hover:text-violet-700 hover:bg-violet-50 transition-all"
          >
            <Shield className="h-4 w-4" />
            <span>Painel Admin</span>
          </Link>
        )}
      </div>
    </aside>
  )
}
