'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { usuariosApi, obras as obrasApi } from '@/lib/sgoApi'
import {
  Plus, Loader2, UserCog, X, Check, Building2, Shield,
  Eye, EyeOff, UserRound, ChevronDown, Trash2, Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

const PERFIS = [
  { value: 'engenheiro',  label: 'Engenheiro',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'mestre',      label: 'Mestre de Obras', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'pcp',         label: 'PCP',          color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'almoxarife',  label: 'Almoxarife',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
]

const FORM_INICIAL = { nome: '', username: '', senha: '', perfil: 'engenheiro' }

export default function UsuariosPage() {
  const { user: authUser } = useAuth()
  const [usuarios, setUsuarios]       = useState<any[]>([])
  const [obras, setObras]             = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState(FORM_INICIAL)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [expandido, setExpandido]     = useState<string | null>(null)

  // Modal vincular obra
  const [vincularModal, setVincularModal] = useState<{ usuario: any } | null>(null)
  const [obrasSel, setObrasSel]       = useState<string[]>([])
  const [vinculando, setVinculando]   = useState(false)

  function carregarTudo() {
    setLoading(true)
    Promise.all([usuariosApi.listar(), obrasApi.listar()])
      .then(([u, o]) => { setUsuarios(u); setObras(o) })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregarTudo() }, [])

  // ─── Criar usuário ────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim() || !form.username.trim() || !form.senha.trim()) {
      toast.error('Preencha Nome, Usuário e Senha.')
      return
    }
    if (form.username.includes('@')) {
      toast.error('O campo Usuário não aceita @. Digite apenas o nome de usuário (ex: joao.silva)')
      return
    }
    if (form.senha.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres.')
      return
    }
    setSaving(true)
    try {
      await usuariosApi.criar({
        nome:     form.nome.trim(),
        username: form.username.trim(),
        senha:    form.senha,
        perfil:   form.perfil,
      })
      toast.success('Usuário criado com sucesso!')
      setShowModal(false)
      setForm(FORM_INICIAL)
      carregarTudo()
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.includes('function') && msg.includes('does not exist')) {
        toast.error('⚠️ Execute o SQL 11 no Supabase primeiro! (database/11_fix_gestors_e_usuarios.sql)', { duration: 8000 })
      } else if (msg.includes('já está em uso')) {
        toast.error(`Usuário "${form.username}" já existe. Escolha outro.`)
      } else if (msg.includes('Sem permissão')) {
        toast.error('Sem permissão. Execute o SQL 11 para corrigir seu perfil para administrador.')
      } else {
        toast.error(msg || 'Erro ao criar usuário.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ─── Desativar usuário ────────────────────────────────────────
  async function desativar(id: string, nome: string) {
    if (!confirm(`Desativar "${nome}"? O acesso será bloqueado imediatamente.`)) return
    try {
      await usuariosApi.desativar(id)
      toast.success('Usuário desativado.')
      carregarTudo()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao desativar usuário.')
    }
  }

  // ─── Vincular obra ────────────────────────────────────────────
  function abrirVincular(usuario: any) {
    const jaVinculadas = (usuario.usuarios_obra ?? [])
      .filter((uo: any) => uo.ativo)
      .map((uo: any) => uo.obra_id)
    setObrasSel(jaVinculadas)
    setVincularModal({ usuario })
  }

  async function salvarVinculos() {
    if (!vincularModal) return
    const { usuario } = vincularModal
    const jaVinculadas = (usuario.usuarios_obra ?? [])
      .filter((uo: any) => uo.ativo)
      .map((uo: any) => uo.obra_id)

    setVinculando(true)
    try {
      // Vincular novas
      const novas = obrasSel.filter(id => !jaVinculadas.includes(id))
      for (const obra_id of novas) {
        await usuariosApi.vincularObra(usuario.id, obra_id, usuario.perfil)
      }
      // Desvincular removidas
      const removidas = jaVinculadas.filter((id: string) => !obrasSel.includes(id))
      for (const obra_id of removidas) {
        await usuariosApi.desvincularObra(usuario.id, obra_id)
      }
      toast.success('Obras atualizadas!')
      setVincularModal(null)
      carregarTudo()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao vincular obras.')
    } finally {
      setVinculando(false)
    }
  }

  const usuariosAtivos   = usuarios.filter(u => u.ativo !== false)
  const usuariosInativos = usuarios.filter(u => u.ativo === false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">
            {usuariosAtivos.length} usuário{usuariosAtivos.length !== 1 ? 's' : ''} ativo{usuariosAtivos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setForm(FORM_INICIAL); setShowModal(true) }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Usuário
        </button>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-2.5">
        <Shield className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">Como funciona o acesso:</span>{' '}
          O gestor cria o usuário com um <strong>nome de usuário</strong> e <strong>senha</strong>.
          O engenheiro/mestre faz login usando seu usuário e senha — sem precisar de e-mail.
          Cada usuário acessa apenas as obras vinculadas a ele.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : usuariosAtivos.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <UserCog className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhum usuário cadastrado ainda.</p>
          <p className="text-sm mt-1">Crie engenheiros e mestres para designar às obras.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {usuariosAtivos.map(u => {
            const perfilInfo = PERFIS.find(p => p.value === u.perfil)
            const obrasVinculadas = (u.usuarios_obra ?? []).filter((uo: any) => uo.ativo)
            const isExpandido = expandido === u.id

            return (
              <div key={u.id} className="rounded-xl border bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{u.nome}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">@{u.username || '—'}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium', perfilInfo?.color ?? 'bg-gray-100 text-gray-600 border-gray-200')}>
                      {perfilInfo?.label ?? u.perfil}
                    </span>
                  </div>

                  {/* Obras vinculadas */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {obrasVinculadas.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Nenhuma obra vinculada</span>
                    ) : (
                      obrasVinculadas.slice(0, isExpandido ? 99 : 3).map((uo: any) => (
                        <span key={uo.obra_id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          <Building2 className="h-3 w-3" />
                          {uo.obras?.nome ?? uo.obra_id.slice(0, 8)}
                        </span>
                      ))
                    )}
                    {!isExpandido && obrasVinculadas.length > 3 && (
                      <button onClick={() => setExpandido(u.id)} className="text-xs text-blue-500 hover:underline">
                        +{obrasVinculadas.length - 3} mais
                      </button>
                    )}
                    {isExpandido && <button onClick={() => setExpandido(null)} className="text-xs text-gray-400 hover:underline">recolher</button>}
                  </div>
                </div>

                {/* Card actions */}
                <div className="flex border-t divide-x">
                  <button
                    onClick={() => abrirVincular(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Obras
                  </button>
                  {authUser?.id !== u.id && (
                    <button
                      onClick={() => desativar(u.id, u.nome)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Desativar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Inativos (colapsável) */}
      {usuariosInativos.length > 0 && (
        <details className="rounded-xl border bg-white overflow-hidden">
          <summary className="flex items-center gap-2 px-5 py-3 cursor-pointer text-sm text-gray-500 hover:bg-gray-50 select-none">
            <ChevronDown className="h-4 w-4" />
            {usuariosInativos.length} usuário{usuariosInativos.length !== 1 ? 's' : ''} inativo{usuariosInativos.length !== 1 ? 's' : ''}
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-gray-50/50">
            {usuariosInativos.map(u => {
              const perfilInfo = PERFIS.find(p => p.value === u.perfil)
              return (
                <div key={u.id} className="rounded-xl border bg-white p-4 opacity-60 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                    {u.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-600 truncate">{u.nome}</p>
                    <p className="text-xs text-gray-400">@{u.username || '—'} · {perfilInfo?.label ?? u.perfil}</p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-gray-100 text-gray-400 border border-gray-200 px-2 py-0.5 text-xs">Inativo</span>
                </div>
              )
            })}
          </div>
        </details>
      )}

      {/* ── Modal Novo Usuário ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-600" /> Novo Usuário
              </h2>
              <button onClick={() => !saving && setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: João Silva"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Usuário (username) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de usuário <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-sm">@</span>
                  <input
                    type="text"
                    value={form.username}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="sgo_username_new"
                    onChange={e => {
                      // Remove @ e espaços automaticamente — impede digitar email no campo
                      const v = e.target.value.toLowerCase().replace(/[@\s]/g, '').replace(/[^a-z0-9._\-]/g, '')
                      setForm(f => ({ ...f, username: v }))
                    }}
                    placeholder="joao.silva"
                    className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Usado para login. Letras, números e ponto.</p>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => setMostrarSenha(v => !v)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Perfil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Perfil / Função <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {PERFIS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, perfil: p.value }))}
                      className={clsx(
                        'rounded-lg border px-3 py-2 text-sm font-medium text-left transition-all',
                        form.perfil === p.value
                          ? 'ring-2 ring-blue-500 ring-offset-1 ' + p.color
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2 transition-colors">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : <><Check className="h-4 w-4" />Criar Usuário</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Vincular Obras ── */}
      {vincularModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-semibold">Vincular Obras</h2>
                <p className="text-sm text-gray-500">{vincularModal.usuario.nome}</p>
              </div>
              <button onClick={() => setVincularModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-2 max-h-72 overflow-y-auto">
              {obras.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma obra cadastrada.</p>
              ) : obras.map(o => (
                <label key={o.id} className={clsx('flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors', obrasSel.includes(o.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50')}>
                  <input
                    type="checkbox"
                    checked={obrasSel.includes(o.id)}
                    onChange={e => {
                      if (e.target.checked) setObrasSel(s => [...s, o.id])
                      else setObrasSel(s => s.filter(id => id !== o.id))
                    }}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{o.nome}</p>
                    <p className="text-xs text-gray-400">{o.status}</p>
                  </div>
                  {obrasSel.includes(o.id) && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setVincularModal(null)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button onClick={salvarVinculos} disabled={vinculando}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
                {vinculando ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : <><Check className="h-4 w-4" />Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
