'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { usuariosApi, obras as obrasApi, empreiteiros as empreiteirosApi, portalApi } from '@/lib/sgoApi'
import { supabase } from '@/lib/supabase'
import {
  Plus, Loader2, UserCog, X, Check, Building2, Shield,
  Eye, EyeOff, ChevronDown, Trash2, Link2, HardHat,
  KeyRound, UserCheck, Lock, AlertCircle, CheckCircle2, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

// Perfis que o gestor pode criar
const PERFIS_GESTOR = [
  { value: 'engenheiro',  label: 'Engenheiro',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'mestre',      label: 'Mestre de Obras', color: 'bg-amber-100   text-amber-700   border-amber-200'   },
  { value: 'pcp',         label: 'PCP',              color: 'bg-violet-100  text-violet-700  border-violet-200'  },
  { value: 'almoxarife',  label: 'Almoxarife',       color: 'bg-orange-100  text-orange-700  border-orange-200'  },
]

// Perfis que o engenheiro pode criar (equipe de campo)
const PERFIS_ENGENHEIRO = [
  { value: 'mestre',     label: 'Mestre de Obras', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'almoxarife', label: 'Almoxarife',      color: 'bg-orange-100 text-orange-700 border-orange-200' },
]

const ROLE_BADGE: Record<string, string> = {
  administrador: 'bg-blue-100 text-blue-700 border border-blue-200',
  gerente:       'bg-indigo-100 text-indigo-700 border border-indigo-200',
  engenheiro:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
  mestre:        'bg-amber-100 text-amber-700 border border-amber-200',
  pcp:           'bg-violet-100 text-violet-700 border border-violet-200',
  almoxarife:    'bg-orange-100 text-orange-700 border border-orange-200',
}

const FORM_INICIAL = { nome: '', username: '', senha: '', perfil: 'engenheiro' }
const EMP_FORM_INICIAL = { razao_social: '', cnpj: '', responsavel: '', telefone: '', email: '' }
const ACESSO_FORM_INICIAL = { nome: '', email: '', senha: '', confirma: '' }

export default function UsuariosPage() {
  const { user: authUser } = useAuth()
  const isGestor = ['administrador', 'gerente'].includes((authUser as any)?.perfil ?? '')

  const [usuarios, setUsuarios]       = useState<any[]>([])
  const [obras, setObras]             = useState<any[]>([])
  const [empreiteiros, setEmpreiteiros] = useState<any[]>([])
  const [acessosEmp, setAcessosEmp]   = useState<Record<string, any[]>>({})
  const [loading, setLoading]         = useState(true)

  // Modal criar usuário
  const [showModal, setShowModal]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState(FORM_INICIAL)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  // Modal vincular obra
  const [vincularModal, setVincularModal] = useState<{ usuario: any } | null>(null)
  const [obrasSel, setObrasSel]       = useState<string[]>([])
  const [vinculando, setVinculando]   = useState(false)

  // Modal empreiteiro
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [savingEmp, setSavingEmp]     = useState(false)
  const [empForm, setEmpForm]         = useState(EMP_FORM_INICIAL)

  // Modal acesso empreiteiro
  const [showAcesso, setShowAcesso]   = useState(false)
  const [empAcesso, setEmpAcesso]     = useState<any>(null)
  const [acessoForm, setAcessoForm]   = useState(ACESSO_FORM_INICIAL)
  const [savingAcesso, setSavingAcesso] = useState(false)
  const [acessoCriado, setAcessoCriado] = useState(false)
  const [mostrarSenhaAcesso, setMostrarSenhaAcesso] = useState(false)

  // Expandir usuário para ver filhos
  const [expandido, setExpandido]     = useState<string | null>(null)

  // Vincular modal open
  const [vincularExpandido, setVincularExpandido] = useState<string | null>(null)

  const perfisDisponiveis = isGestor ? PERFIS_GESTOR : PERFIS_ENGENHEIRO

  function carregarTudo() {
    setLoading(true)
    const ps: Promise<any>[] = [
      usuariosApi.listar(),
      obrasApi.listar(),
    ]
    if (isGestor) ps.push(empreiteirosApi.listar())
    Promise.all(ps)
      .then(([u, o, emp]) => {
        setUsuarios(u)
        setObras(o)
        if (emp) {
          setEmpreiteiros(emp)
          // Carrega acessos de cada empreiteiro
          Promise.all(emp.map(async (e: any) => {
            const acc = await portalApi.listarAcessos(e.id).catch(() => [])
            return [e.id, acc] as [string, any[]]
          })).then(entries => setAcessosEmp(Object.fromEntries(entries)))
        }
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregarTudo() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Criar usuário ──────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim() || !form.username.trim() || !form.senha.trim()) {
      toast.error('Preencha Nome, Usuário e Senha.'); return
    }
    if (form.senha.length < 6) { toast.error('Senha mínima 6 caracteres'); return }
    setSaving(true)
    try {
      await usuariosApi.criar({ nome: form.nome.trim(), username: form.username.trim(), senha: form.senha, perfil: form.perfil })
      toast.success('Usuário criado!')
      setShowModal(false); setForm(FORM_INICIAL)
      carregarTudo()
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.includes('já está em uso')) toast.error(`Usuário "${form.username}" já existe`)
      else if (msg.includes('Sem permissão')) toast.error('Execute o SQL de configuração no Supabase')
      else toast.error(msg || 'Erro ao criar usuário')
    } finally { setSaving(false) }
  }

  // ── Desativar usuário ──────────────────────────────────────
  async function desativar(id: string, nome: string) {
    if (!confirm(`Desativar "${nome}"?`)) return
    try {
      await usuariosApi.desativar(id)
      toast.success('Usuário desativado.')
      carregarTudo()
    } catch (err: any) { toast.error(err?.message ?? 'Erro') }
  }

  // ── Vincular obras ─────────────────────────────────────────
  function abrirVincular(usuario: any) {
    // Engenheiro não pode vincular obras a si mesmo
    if (usuario.id === authUser?.id) { toast.error('Você não pode vincular obras a si mesmo'); return }
    const jaVinc = (usuario.usuarios_obra ?? []).filter((uo: any) => uo.ativo).map((uo: any) => uo.obra_id)
    setObrasSel(jaVinc)
    setVincularModal({ usuario })
  }

  async function salvarVinculos() {
    if (!vincularModal) return
    const { usuario } = vincularModal
    const jaVinc = (usuario.usuarios_obra ?? []).filter((uo: any) => uo.ativo).map((uo: any) => uo.obra_id)
    setVinculando(true)
    try {
      for (const obra_id of obrasSel.filter(id => !jaVinc.includes(id)))
        await usuariosApi.vincularObra(usuario.id, obra_id, usuario.perfil)
      for (const obra_id of jaVinc.filter((id: string) => !obrasSel.includes(id)))
        await usuariosApi.desvincularObra(usuario.id, obra_id)
      toast.success('Obras atualizadas!')
      setVincularModal(null)
      carregarTudo()
    } catch (err: any) { toast.error(err?.message ?? 'Erro') }
    finally { setVinculando(false) }
  }

  // ── Criar empreiteiro ──────────────────────────────────────
  async function criarEmpreiteiro(e: React.FormEvent) {
    e.preventDefault()
    if (!empForm.razao_social.trim()) { toast.error('Razão social obrigatória'); return }
    setSavingEmp(true)
    try {
      await empreiteirosApi.criar({ ...empForm, razao_social: empForm.razao_social.trim() })
      toast.success('Empreiteiro cadastrado!')
      setShowEmpModal(false); setEmpForm(EMP_FORM_INICIAL)
      carregarTudo()
    } catch (err: any) { toast.error(err?.message ?? 'Erro') }
    finally { setSavingEmp(false) }
  }

  // ── Criar acesso empreiteiro ───────────────────────────────
  function abrirCriarAcesso(emp: any) {
    setEmpAcesso(emp)
    setAcessoForm({ nome: emp.responsavel ?? emp.razao_social, email: emp.email ?? '', senha: '', confirma: '' })
    setAcessoCriado(false); setMostrarSenhaAcesso(false)
    setShowAcesso(true)
  }

  async function criarAcesso(ev: React.FormEvent) {
    ev.preventDefault()
    if (!empAcesso) return
    if (acessoForm.senha.length < 6) { toast.error('Senha mínima 6 caracteres'); return }
    if (acessoForm.senha !== acessoForm.confirma) { toast.error('Senhas não coincidem'); return }
    if (!acessoForm.email.trim()) { toast.error('E-mail obrigatório'); return }
    setSavingAcesso(true)
    try {
      await portalApi.criarAcesso({
        empreiteiro_id: empAcesso.id,
        construtora_id: (empAcesso as any).construtora_id,
        nome: acessoForm.nome.trim(),
        email: acessoForm.email.trim(),
        senha: acessoForm.senha,
      })
      setAcessoCriado(true)
      toast.success('Acesso criado! Empreiteiro já pode entrar no portal.')
      carregarTudo()
    } catch (err: any) { toast.error(err?.message ?? 'Erro') }
    finally { setSavingAcesso(false) }
  }

  // ── Filtrar usuários por hierarquia ────────────────────────
  // Gestor vê todos; engenheiro vê apenas os que ele criou
  const usuariosVisiveis = isGestor
    ? usuarios.filter(u => u.ativo !== false)
    : usuarios.filter(u => u.ativo !== false && u.criado_por === authUser?.id)

  const usuariosInativos = usuarios.filter(u => u.ativo === false)

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isGestor ? 'Usuários & Empreiteiros' : 'Minha Equipe'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isGestor
              ? `${usuariosVisiveis.length} usuário(s) · ${empreiteiros.length} empreiteiro(s)`
              : `${usuariosVisiveis.length} membro(s) da equipe`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isGestor && (
            <button onClick={() => { setEmpForm(EMP_FORM_INICIAL); setShowEmpModal(true) }}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <HardHat className="h-4 w-4 text-amber-500" /> Novo Empreiteiro
            </button>
          )}
          <button onClick={() => { setForm({ ...FORM_INICIAL, perfil: perfisDisponiveis[0].value }); setShowModal(true) }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> {isGestor ? 'Novo Usuário' : 'Adicionar à equipe'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-2.5">
        <Shield className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          {isGestor
            ? <><strong>Gestor:</strong> você cria engenheiros/mestres e vincula obras a eles. Cada engenheiro acessa apenas suas obras e pode criar a própria equipe.</>
            : <><strong>Engenheiro:</strong> você pode criar mestres, PCP e almoxarifes para sua equipe. Eles terão acesso às obras vinculadas a você.</>
          }
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="space-y-6">

          {/* ── Seção: Usuários ─────────────────────────────────── */}
          {usuariosVisiveis.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" /> Equipe
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {usuariosVisiveis.map(u => {
                  const badge   = ROLE_BADGE[u.perfil] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
                  const obrasVinc = (u.usuarios_obra ?? []).filter((uo: any) => uo.ativo)
                  const isSelf  = u.id === authUser?.id
                  const isExpand = expandido === u.id

                  return (
                    <div key={u.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                            {u.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 truncate">{u.nome}</p>
                              {isSelf && <span className="text-[10px] text-blue-500 font-medium">(você)</span>}
                            </div>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">@{u.username || '—'}</p>
                          </div>
                          <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', badge)}>
                            {PERFIS_GESTOR.find(p => p.value === u.perfil)?.label ?? u.perfil}
                          </span>
                        </div>

                        {/* Obras vinculadas */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {obrasVinc.length === 0
                            ? <span className="text-xs text-gray-400 italic">Nenhuma obra vinculada</span>
                            : obrasVinc.slice(0, isExpand ? 99 : 2).map((uo: any) => (
                              <span key={uo.obra_id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                <Building2 className="h-3 w-3" />
                                {uo.obras?.nome ?? uo.obra_id.slice(0, 8)}
                              </span>
                            ))
                          }
                          {!isExpand && obrasVinc.length > 2 && (
                            <button onClick={() => setExpandido(u.id)} className="text-xs text-blue-500 hover:underline">+{obrasVinc.length - 2}</button>
                          )}
                          {isExpand && <button onClick={() => setExpandido(null)} className="text-xs text-gray-400 hover:underline">recolher</button>}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex border-t divide-x">
                        {/* Gestor vincula obras; engenheiro não pode vincular a si mesmo */}
                        {isGestor && !isSelf && (
                          <button onClick={() => abrirVincular(u)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors">
                            <Link2 className="h-3.5 w-3.5" /> Obras
                          </button>
                        )}
                        {!isSelf && (
                          <button onClick={() => desativar(u.id, u.nome)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" /> Desativar
                          </button>
                        )}
                        {isSelf && (
                          <div className="flex-1 flex items-center justify-center py-2.5 text-xs text-gray-400 italic">Seu acesso</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {usuariosVisiveis.length === 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-gray-400">
              <UserCog className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Nenhum usuário cadastrado ainda</p>
            </div>
          )}

          {/* ── Seção: Empreiteiros (só gestor) ─────────────────── */}
          {isGestor && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <HardHat className="h-4 w-4" /> Empreiteiros & Portais
              </h2>
              {empreiteiros.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-400 text-sm">
                  Nenhum empreiteiro cadastrado ainda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {empreiteiros.map(emp => {
                    const accs = acessosEmp[emp.id] ?? []
                    return (
                      <div key={emp.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-lg shrink-0">
                            {(emp.nome_fantasia || emp.razao_social).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{emp.nome_fantasia || emp.razao_social}</p>
                            {emp.cnpj && <p className="text-xs text-gray-400">{emp.cnpj}</p>}
                            {emp.responsavel && <p className="text-xs text-gray-500">Resp.: {emp.responsavel}</p>}
                          </div>
                          {accs.length > 0 && (
                            <span className="shrink-0 flex items-center gap-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 text-[10px] font-medium">
                              <UserCheck className="h-3 w-3" /> Portal
                            </span>
                          )}
                        </div>

                        {/* Acessos existentes */}
                        {accs.length > 0 && (
                          <div className="mb-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 space-y-1">
                            {accs.map((a: any) => (
                              <p key={a.id} className="text-xs text-gray-600 flex items-center gap-1.5">
                                <UserCheck className="h-3 w-3 text-teal-500 shrink-0" />
                                {a.email}
                              </p>
                            ))}
                          </div>
                        )}

                        <button onClick={() => abrirCriarAcesso(emp)}
                          className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                          <KeyRound className="h-3.5 w-3.5" />
                          {accs.length > 0 ? 'Criar outro acesso' : 'Criar acesso ao portal'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Inativos */}
          {isGestor && usuariosInativos.length > 0 && (
            <details className="rounded-xl border bg-white overflow-hidden">
              <summary className="flex items-center gap-2 px-5 py-3 cursor-pointer text-sm text-gray-400 hover:bg-gray-50 select-none">
                <ChevronDown className="h-4 w-4" /> {usuariosInativos.length} usuário(s) inativo(s)
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50/50">
                {usuariosInativos.map(u => (
                  <div key={u.id} className="rounded-xl border bg-white p-3 opacity-60 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                      {u.nome.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-600 truncate">{u.nome}</p>
                      <p className="text-xs text-gray-400">@{u.username || '—'}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-gray-100 text-gray-400 px-2 py-0.5 text-xs">Inativo</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── Modal Novo Usuário ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-600" />
                {isGestor ? 'Novo Usuário' : 'Adicionar à Equipe'}
              </h2>
              <button onClick={() => !saving && setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: João Silva"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de usuário *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-sm">@</span>
                  <input type="text" value={form.username} autoComplete="off"
                    onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[@\s]/g, '').replace(/[^a-z0-9._\-]/g, '') }))}
                    placeholder="joao.silva"
                    className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Para login (sem @, letras e números)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <div className="relative">
                  <input type={mostrarSenha ? 'text' : 'password'} value={form.senha}
                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setMostrarSenha(v => !v)} className="absolute right-3 top-2.5 text-gray-400">
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Perfil *</label>
                <div className="grid grid-cols-2 gap-2">
                  {perfisDisponiveis.map(p => (
                    <button key={p.value} type="button" onClick={() => setForm(f => ({ ...f, perfil: p.value }))}
                      className={clsx('rounded-lg border px-3 py-2 text-sm font-medium text-left transition-all',
                        form.perfil === p.value ? 'ring-2 ring-blue-500 ring-offset-1 ' + p.color : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : <><Check className="h-4 w-4" />Criar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Vincular Obras ─────────────────────────────── */}
      {vincularModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-semibold">Vincular Obra</h2>
                <p className="text-sm text-gray-500">{vincularModal.usuario.nome}</p>
              </div>
              <button onClick={() => setVincularModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {/* Engenheiro/mestre: apenas 1 obra (radio) */}
            {['engenheiro','mestre','pcp','almoxarife'].includes(vincularModal.usuario.perfil) && (
              <div className="mx-5 mt-4 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                Selecione <strong>1 obra</strong>. Engenheiro acessa apenas a obra vinculada.
              </div>
            )}
            <div className="p-5 space-y-2 max-h-72 overflow-y-auto">
              {obras.length === 0
                ? <p className="text-sm text-gray-400 text-center py-4">Nenhuma obra cadastrada.</p>
                : obras.map(o => {
                  const isRestrito = ['engenheiro','mestre','pcp','almoxarife'].includes(vincularModal.usuario.perfil)
                  const selected = obrasSel.includes(o.id)
                  return (
                    <label key={o.id} className={clsx('flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                      selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50')}>
                      <input
                        type={isRestrito ? 'radio' : 'checkbox'}
                        name="obra_vinculo"
                        checked={selected}
                        onChange={() => {
                          if (isRestrito) setObrasSel([o.id])
                          else setObrasSel(s => selected ? s.filter(id => id !== o.id) : [...s, o.id])
                        }}
                        className="h-4 w-4 accent-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{o.nome}</p>
                        <p className="text-xs text-gray-400 capitalize">{o.status}</p>
                      </div>
                      {selected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                    </label>
                  )
                })
              }
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setVincularModal(null)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button onClick={salvarVinculos} disabled={vinculando}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                {vinculando ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : <><Check className="h-4 w-4" />Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Novo Empreiteiro ──────────────────────────── */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2"><HardHat className="h-5 w-5 text-amber-500" />Novo Empreiteiro</h2>
              <button onClick={() => setShowEmpModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={criarEmpreiteiro} className="p-5 space-y-4">
              {[
                { name: 'razao_social', label: 'Razão Social *', placeholder: 'Ex.: Construtora Silva Ltda', required: true },
                { name: 'cnpj',          label: 'CNPJ',           placeholder: '00.000.000/0001-00' },
                { name: 'responsavel',   label: 'Responsável',    placeholder: 'Nome do responsável' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type="text" required={f.required} value={(empForm as any)[f.name]}
                    onChange={e => setEmpForm(p => ({ ...p, [f.name]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'telefone', label: 'Telefone', placeholder: '(11) 99999-9999' },
                  { name: 'email',    label: 'E-mail',   placeholder: 'contato@empresa.com' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type="text" value={(empForm as any)[f.name]}
                      onChange={e => setEmpForm(p => ({ ...p, [f.name]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowEmpModal(false)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={savingEmp}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                  {savingEmp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Criar Acesso Empreiteiro ──────────────────── */}
      {showAcesso && empAcesso && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><KeyRound className="h-4 w-4 text-blue-500" /> Criar Acesso ao Portal</h2>
                <p className="text-xs text-gray-400 mt-0.5">{empAcesso.nome_fantasia || empAcesso.razao_social}</p>
              </div>
              <button onClick={() => setShowAcesso(false)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            {acessoCriado ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-teal-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 text-lg mb-1">Acesso criado!</h3>
                <p className="text-gray-500 text-sm mb-1">E-mail: <strong>{acessoForm.email}</strong></p>
                <p className="text-gray-400 text-xs mb-5">Portal: <strong className="text-blue-500 select-all">studiomagmo-bit.github.io/sgo/portal/login</strong></p>
                <button onClick={() => setShowAcesso(false)} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">Fechar</button>
              </div>
            ) : (
              <form onSubmit={criarAcesso} className="px-5 py-4 space-y-4">
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700 flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  O empreiteiro acessará o portal em <strong>studiomagmo-bit.github.io/sgo/portal/login</strong>
                </div>
                {[
                  { key: 'nome',  label: 'Nome do responsável *', type: 'text',  placeholder: 'Nome completo' },
                  { key: 'email', label: 'E-mail de acesso *',    type: 'email', placeholder: 'email@empresa.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                    <input type={f.type} required value={(acessoForm as any)[f.key]}
                      onChange={e => setAcessoForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                {(['senha', 'confirma'] as const).map(k => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{k === 'senha' ? 'Senha *' : 'Confirmar senha *'}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type={mostrarSenhaAcesso ? 'text' : 'password'} required minLength={6}
                        value={acessoForm[k]}
                        onChange={e => setAcessoForm(p => ({ ...p, [k]: e.target.value }))}
                        placeholder={k === 'senha' ? 'Mínimo 6 caracteres' : 'Repita a senha'}
                        className={clsx('w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none',
                          k === 'confirma' && acessoForm.confirma && acessoForm.senha !== acessoForm.confirma
                            ? 'border-red-400 focus:ring-2 focus:ring-red-400'
                            : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                        )} />
                      {k === 'confirma' && (
                        <button type="button" onClick={() => setMostrarSenhaAcesso(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {mostrarSenhaAcesso ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    {k === 'confirma' && acessoForm.confirma && acessoForm.senha !== acessoForm.confirma && (
                      <p className="text-xs text-red-500 mt-1">Senhas não coincidem</p>
                    )}
                  </div>
                ))}
                <div className="flex gap-2 pt-2 border-t">
                  <button type="button" onClick={() => setShowAcesso(false)} className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">Cancelar</button>
                  <button type="submit" disabled={savingAcesso}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                    {savingAcesso ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : <><KeyRound className="h-4 w-4" />Criar Acesso</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
