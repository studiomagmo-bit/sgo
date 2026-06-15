'use client'
import { useEffect, useState } from 'react'
import { inspecoes as inspecoesApi, obras as obrasApi, atividades as pcpAtividades } from '@/lib/sgoApi'
import { useObraContext } from '@/hooks/useObraContext'
import { ObraSelector } from '@/components/ObraSelector'
import { useAuth } from '@/contexts/auth'
import type { Obra, Atividade } from '@/types'
import { Plus, Loader2, CheckCircle, Clock, XCircle, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'

const statusConfig: Record<string, { label: string; cls: string; icon: any }> = {
  aguardando:             { label: 'Aguardando',    cls: 'badge-amarelo', icon: Clock       },
  aprovada:               { label: 'Aprovada',      cls: 'badge-verde',   icon: CheckCircle },
  aprovada_com_ressalvas: { label: 'Com Ressalvas', cls: 'badge-azul',    icon: AlertCircle },
  reprovada:              { label: 'Reprovada',     cls: 'badge-vermelho',icon: XCircle     },
}

const hoje = new Date().toISOString().slice(0, 10)

export default function InspecoesPage() {
  const { user } = useAuth()
  const { obras, obraId, setObraId, isRestrito } = useObraContext()
  const [inspecoes, setInspecoes]   = useState<any[]>([])
  const [loading, setLoading]       = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  const [showModal, setShowModal]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [atividadesLista, setAtividadesLista] = useState<Atividade[]>([])
  const [loadingAtiv, setLoadingAtiv] = useState(false)

  const [form, setForm] = useState({
    obra_id:          '',
    atividade_id:     '',
    data_solicitacao: hoje,
    observacoes:      '',
    libera_medicao:   false,
  })

  

  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    inspecoesApi.listar({ obra_id: obraId, status: filtroStatus || undefined })
      .then(d => { setInspecoes(d); () => setLoading(false) }).catch(() => () => setLoading(false))
  }, [obraId, filtroStatus])

  function abrirModal() {
    setForm({ obra_id: obraId || '', atividade_id: '', data_solicitacao: hoje, observacoes: '', libera_medicao: false })
    setAtividadesLista([])
    // Se já há obra selecionada, carrega atividades automaticamente
    if (obraId) {
      setLoadingAtiv(true)
      pcpAtividades.listar({ obra_id: obraId })
        .then(d => setAtividadesLista(d as Atividade[]))
    }
    setShowModal(true)
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.obra_id || !form.atividade_id) {
      toast.error('Selecione a obra e a atividade.')
      return
    }
    setSaving(true)
    try {
      await inspecoesApi.criar({
        obra_id:          form.obra_id,
        atividade_id:     form.atividade_id,
        data_solicitacao: form.data_solicitacao,
        observacoes:      form.observacoes || null,
        libera_medicao:   form.libera_medicao,
        status:           'aguardando',
      })
      toast.success('Inspeção criada com sucesso!')
      setShowModal(false)
      if (form.obra_id === obraId || !obraId) {
        setObraId(form.obra_id)
        setLoading(true)
        inspecoesApi.listar({ obra_id: form.obra_id, status: filtroStatus || undefined })
          .then(d => { setInspecoes(d); () => setLoading(false) }).catch(() => () => setLoading(false))
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao criar inspeção.')
    } finally {
      setSaving(false)
    }
  }

  // Atualizar status de inspeção inline
  async function atualizarStatus(id: string, novoStatus: string) {
    try {
      await inspecoesApi.atualizar(id, { status: novoStatus })
      setInspecoes(prev => prev.map(i => i.id === id ? { ...i, status: novoStatus } : i))
      toast.success('Status atualizado')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspeções</h1>
          <p className="text-sm text-gray-500 mt-1">Controle de qualidade e aprovações</p>
        </div>
        <button onClick={abrirModal} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Nova Inspeção
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <ObraSelector obras={obras} obraId={obraId} setObraId={setObraId} isRestrito={isRestrito} />
      )}
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          {Object.entries(statusConfig).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
        </select>
      </div>

      {obraId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(statusConfig).map(([k, v]) => {
            const count = inspecoes.filter(i => i.status === k).length
            const Icon = v.icon
            return (
              <button key={k} onClick={() => setFiltroStatus(filtroStatus === k ? '' : k)}
                className={`rounded-xl p-4 border-2 text-left transition-all ${filtroStatus === k ? 'border-blue-500 shadow-md bg-blue-50' : 'border-transparent bg-white shadow-sm hover:shadow-md'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-gray-500" />
                  <p className="text-xs text-gray-500">{v.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </button>
            )
          })}
        </div>
      )}

      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver as inspeções</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                {['Atividade','Data Solicitação','Status','Libera Medição','Ação'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inspecoes.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Nenhuma inspeção encontrada</td></tr>
              ) : inspecoes.map(i => {
                const s = statusConfig[i.status] || { label: i.status, cls: 'badge-cinza', icon: Clock }
                // Usa join quando disponível, fallback para UUID curto
                const nomeAtividade = i.atividades?.nome ?? i.atividade_id?.substring(0, 8) + '…'
                return (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{nomeAtividade}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {i.data_solicitacao ? new Date(i.data_solicitacao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3"><span className={s.cls}>{s.label}</span></td>
                    <td className="px-4 py-3">
                      <span className={i.libera_medicao ? 'badge-verde' : 'badge-cinza'}>
                        {i.libera_medicao ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {i.status === 'aguardando' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => atualizarStatus(i.id, 'aprovada')}
                            className="rounded px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                          >Aprovar</button>
                          <button
                            onClick={() => atualizarStatus(i.id, 'reprovada')}
                            className="rounded px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                          >Reprovar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">Nova Inspeção</h2>
              <button onClick={() => setShowModal(false)} aria-label="Fechar"><X className="h-5 w-5 text-gray-500" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Obra <span className="text-red-500">*</span></label>
                <select
                  value={form.obra_id}
                  onChange={e => handleObraChange(e.target.value)}
                  required
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma obra...</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Solicitação <span className="text-red-500">*</span></label>
                <input type="date" value={form.data_solicitacao} onChange={e => setForm(f => ({ ...f, data_solicitacao: e.target.value }))} required
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3} placeholder="Observações opcionais..."
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="flex items-center gap-3">
                <input id="libera_medicao" type="checkbox" checked={form.libera_medicao}
                  onChange={e => setForm(f => ({ ...f, libera_medicao: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="libera_medicao" className="text-sm font-medium text-gray-700">Libera Medição</label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
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
