'use client'
import { useEffect, useState } from 'react'
import { pendencias as pendenciasApi, obras as obrasApi, atividades as pcpAtividades } from '@/lib/sgoApi'
import { useObraContext } from '@/hooks/useObraContext'
import { ObraSelector } from '@/components/ObraSelector'
import { useAuth } from '@/contexts/auth'
import type { Pendencia, Obra, Atividade } from '@/types'
import { Plus, Loader2, AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'

const statusConfig: Record<string, { label: string; cls: string }> = {
  criada:      { label: 'Criada',      cls: 'badge-azul'    },
  em_correcao: { label: 'Em Correção', cls: 'badge-amarelo' },
  corrigida:   { label: 'Corrigida',   cls: 'badge-verde'   },
  validada:    { label: 'Validada',    cls: 'badge-cinza'   },
  cancelada:   { label: 'Cancelada',   cls: 'badge-vermelho'},
}

const STATUS_OPCOES = [
  { value: 'criada',      label: 'Criada'      },
  { value: 'em_correcao', label: 'Em Correção' },
  { value: 'corrigida',   label: 'Corrigida'   },
  { value: 'validada',    label: 'Validada'    },
  { value: 'cancelada',   label: 'Cancelada'   },
]

export default function PendenciasPage() {
  // ── listagem ─────────────────────────────────────────────────
  const { user } = useAuth()
  const isRestrito = ['engenheiro','mestre','pcp','almoxarife'].includes((user as any)?.perfil ?? '')
  const [obras, setObras]           = useState<Obra[]>([])
  const [obraId, setObraId]         = useState('')
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [loading, setLoading]       = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  // ── modal ────────────────────────────────────────────────────
  const [showModal, setShowModal]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const [modalObrasLista, setModalObrasLista] = useState<Obra[]>([])
  const [atividadesLista, setAtividadesLista] = useState<Atividade[]>([])
  const [loadingAtiv, setLoadingAtiv]     = useState(false)

  const [form, setForm] = useState({
    obra_id:      '',
    atividade_id: '',
    descricao:    '',
    prazo:        '',
    status:       'criada',
  })

  // ── efeitos de listagem ──────────────────────────────────────
  useEffect(() => {
    obrasApi.listar().then(obs => {
      setObras(obs)
      // Engenheiro: auto-seleciona sua obra única
      try {
        const u = JSON.parse(localStorage.getItem('sgo_user') ?? '{}')
        const perfisRestritos = ['engenheiro','mestre','pcp','almoxarife']
        if (perfisRestritos.includes(u?.perfil) && obs.length === 1) {
          setObraId(obs[0].id)
        }
      } catch {}
    })
  }, [])

  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    pendenciasApi.listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(d => { setPendencias(d); () => setLoading(false) }).catch(() => () => setLoading(false))
  }, [obraId, filtroStatus])

  const abertas = pendencias.filter(p => !['validada','cancelada'].includes(p.status)).length

  // ── abrir modal ──────────────────────────────────────────────
  function abrirModal() {
    setForm({ obra_id: '', atividade_id: '', descricao: '', prazo: '', status: 'criada' })
    setAtividadesLista([])
    setModalObrasLista(obras)
    setShowModal(true)
  }

  // ── quando obra muda no modal ────────────────────────────────
  async function handleObraChange(id: string) {
    setForm(f => ({ ...f, obra_id: id, atividade_id: '' }))
    if (!id) { setAtividadesLista([]); return }
    setLoadingAtiv(true)
    try {
      const data = await pcpAtividades.listar({ obra_id: id })
      setAtividadesLista(data as Atividade[])
    } finally {
      setLoadingAtiv(false)
    }
  }

  // ── submit ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.obra_id || !form.atividade_id) {
      toast.error('Selecione a obra e a atividade.')
      return
    }
    if (!form.descricao.trim()) {
      toast.error('A descrição é obrigatória.')
      return
    }
    setSaving(true)
    try {
      await pendenciasApi.criar({
        obra_id:      form.obra_id,
        atividade_id: form.atividade_id,
        descricao:    form.descricao,
        prazo:        form.prazo || null,
        status:       form.status,
      })
      toast.success('Pendência criada com sucesso!')
      setShowModal(false)
      // recarrega se a obra do modal for a mesma do filtro
      if (form.obra_id === obraId || !obraId) {
        setObraId(form.obra_id)
        setLoading(true)
        pendenciasApi.listar({ obra_id: form.obra_id, status: filtroStatus || undefined })
          .then(d => { setPendencias(d); () => setLoading(false) }).catch(() => () => setLoading(false))
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao criar pendência.')
    } finally {
      setSaving(false)
    }
  }

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pendências</h1>
          <p className="text-sm text-gray-500 mt-1">Não conformidades e itens a corrigir</p>
        </div>
        <button
          onClick={abrirModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova Pendência
        </button>
      </div>

      {/* filtros */}
      <div className="flex gap-3 flex-wrap">
        <ObraSelector obras={obras} obraId={obraId} setObraId={setObraId} isRestrito={isRestrito} />
      )}
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          {Object.entries(statusConfig).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
        </select>
      </div>

      {/* KPIs */}
      {obraId && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(statusConfig).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white border p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500">{v.label}</p>
              <p className="text-xl font-bold mt-1">{pendencias.filter(p => p.status === k).length}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300"/>
          <p>Selecione uma obra para ver as pendências</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="space-y-3">
          {pendencias.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-gray-400">Nenhuma pendência encontrada.</div>
          ) : pendencias.map(p => {
            const s = statusConfig[p.status]
            return (
              <div key={p.id} className="rounded-xl border bg-white shadow-sm p-4 flex items-start gap-4">
                <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${p.status === 'criada' ? 'text-red-500' : 'text-yellow-500'}`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{p.descricao}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{(p as any).atividades?.nome ?? '—'}</p>
                    <span className={s.cls}>{s.label}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {p.prazo && <span>Prazo: {new Date(p.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                    <span>Criada em: {new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                    {p.inspecao_id && <span className="badge-azul">Vinculada à inspeção</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal Nova Pendência ────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">Nova Pendência</h2>
              <button onClick={() => setShowModal(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Obra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Obra <span className="text-red-500">*</span></label>
                <select
                  value={form.obra_id}
                  onChange={e => handleObraChange(e.target.value)}
                  required
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma obra...</option>
                  {modalObrasLista.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>

              {/* Atividade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atividade <span className="text-red-500">*</span></label>
                <select
                  value={form.atividade_id}
                  onChange={e => setForm(f => ({ ...f, atividade_id: e.target.value }))}
                  required
                  disabled={!form.obra_id || loadingAtiv}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">
                    {loadingAtiv ? 'Carregando...' : !form.obra_id ? 'Selecione uma obra primeiro' : 'Selecione uma atividade...'}
                  </option>
                  {atividadesLista.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição <span className="text-red-500">*</span></label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Descreva a pendência..."
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Prazo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                <input
                  type="date"
                  value={form.prazo}
                  onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPCOES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* ações */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
