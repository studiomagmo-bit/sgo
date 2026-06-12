'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }

    // Engenheiro/mestre: na primeira visita ao /dashboard,
    // redireciona para /pcp-dashboard (a tela principal deles)
    // O próprio dashboard/page.tsx mostra o DashEngenheiro correto
    // então só precisamos garantir que não estão vendo o login
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0 ml-60">
        <div className="min-h-screen p-6 w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
