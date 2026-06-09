'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/lib/supabase'
import { Building2, User, Info, KeyRound, Loader2 } from 'lucide-react'
import type { Construtora } from '@/types'

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const [construtora, setConstrutora] = useState<Construtora | null>(null)
  const [loadingConst, setLoadingConst] = useState(false)
  const [senhaMensagem, setSenhaMensagem] = useState(false)

  useEffect(() => {
    if (!user?.construtora_id) return
    setLoadingConst(true)
    supabase
      .from('construtoras')
      .select('*')
      .eq('id', user.construtora_id)
      .single()
      .then(({ data }) => {
        if (data) setConstrutora(data as Construtora)
      })
      .finally(() => setLoadingConst(false))
  }, [user?.construtora_id])

  const perfilLabel: Record<string, string> = {
    administrador: 'Administrador',
    diretor:       'Diretor',
    gerente:       'Gerente',
    engenheiro:    'Engenheiro',
    mestre:        'Mestre de Obras',
    pcp:           'PCP',
    almoxarife:    'Almoxarife',
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie seu perfil e informações do sistema</p>
      </div>

      {/* ── Seção 1: Perfil da Construtora ─────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-800">Perfil da Construtora</h2>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          {loadingConst ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : construtora ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">{construtora.nome}</p>
                  {construtora.cnpj && (
                    <p className="text-sm text-gray-500">CNPJ: {construtora.cnpj}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Nome</p>
                  <p className="text-sm text-gray-800 mt-1">{construtora.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">CNPJ</p>
                  <p className="text-sm text-gray-800 mt-1">{construtora.cnpj || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Status</p>
                  <p className="text-sm mt-1">
                    <span className={construtora.ativa ? 'text-green-600 font-medium' : 'text-red-500'}>
                      {construtora.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhuma construtora vinculada à sua conta.</p>
          )}
        </div>
      </section>

      {/* ── Seção 2: Meu Perfil ────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-800">Meu Perfil</h2>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
          {/* Avatar + nome */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
              {user?.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{user?.nome || '—'}</p>
              <p className="text-sm text-gray-500">{user?.email || '—'}</p>
            </div>
          </div>

          {/* Dados */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Nome</p>
              <p className="text-sm text-gray-800 mt-1">{user?.nome || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">E-mail</p>
              <p className="text-sm text-gray-800 mt-1">{user?.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Perfil</p>
              <p className="text-sm text-gray-800 mt-1 capitalize">
                {user?.perfil ? (perfilLabel[user.perfil] ?? user.perfil) : '—'}
              </p>
            </div>
            {user?.telefone && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Telefone</p>
                <p className="text-sm text-gray-800 mt-1">{user.telefone}</p>
              </div>
            )}
          </div>

          {/* Alterar senha */}
          <div className="pt-2 border-t">
            <button
              onClick={() => setSenhaMensagem(v => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
            >
              <KeyRound className="h-4 w-4" />
              Alterar Senha
            </button>
            {senhaMensagem && (
              <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                Acesse seu e-mail para redefinir a senha.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Seção 3: Sobre o Sistema ───────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-800">Sobre o Sistema</h2>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-gray-900" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-gray-900 text-lg">SGO <span className="text-blue-600">v0.1.0</span></p>
              <p className="text-sm text-gray-600">Sistema de Gestão Operacional de Obras</p>
              <p className="text-sm text-gray-500">Desenvolvido para a construção civil</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Versão</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">0.1.0</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Plataforma</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">Web</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Tecnologia</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">Next.js 14</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
