'use client'
import { useEffect, useState } from 'react'
import { efetivos as efetivosApi, obras as obrasApi, empreiteiros as empreiteirosApi } from '@/lib/sgoApi'
import type { EfetivoDiario, Obra, Empreiteiro } from '@/types'
import { Plus, Loader2, Users, UserCheck, UserX, X } from 'lucide-react'
import { toast } from 'sonner'

export default function EfetivoPage() {
  const [obras, setObras]               = useState<Obra[]>([])
  const [empreiteiros, setEmpreiteiros] = useState<Empreiteiro[]>([])
  const [obraId, setObraId]             = useState('')
  const [efetivos, setEfetivos]         = useState<EfetivoDiario[]>([])
  const [loading, setLoading]           = useState(false)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    obra_id:        '',
    empreiteiro_id: '',
    data:           new Date().toISOString().split('T')[0],
    observacoes:    '',
  })

  useEffect(() => {
    obrasApi.listar().then(setObras)
    empreiteirosApi.listar().then(setEmpreiteiros)
  }, [])

  useEffect(() => {
    if (!obraId) return
    carregarEfetivos()
  }, [obraId])

  function carregarEfetivos() {
    setLoading(true)
    efetivosApi.listar({ obra_id: obraId })
      .then(setEfetivos)
      .finally(() => setLoading(false))
  }

  function abrirModal() {
    setForm({
      obra_id:        obraId,
      empreiteiro_id: '',
      data:           new Date().toISOString().split('T')[0],
      observacoes:    '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.obra_id || !form.empreiteiro_id || !form.data) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }
    setSaving(true)
    try {
      await efetivosApi.criar({
        obra_id:        form.obra_id,
        empreiteiro_id: form.empreiteiro_id,
        data:           form.data,
        observacoes:    form.observacoes || undefined,
      })
      toast.success('Efetivo registrado com sucesso!')
      setShowModal(false)
      if (obraId === form.obra_id) {
        carregarEfetivos()
      } else {
        setObraId(form.obra_id)
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao registrar efetivo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Efetivo Diário</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de presença por equipe</p>
        </div>
        <button
          onClick={abrirModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Registrar Efetivo
        </button>
      </div>

      {/* Filtro de obra */}
      <select
        value={obraId}
        onChange={e => setObraId(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
      >
        <option value="">Selecione uma obra...</option>
        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

      {/* Lista */}
      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver o efetivo</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {efetivos.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-gray-400">
              Nenhum efetivo registrado.
            </div>
          ) : efetivos.map(ef => {
            const presentes = ef.colaboradores?.filter(c => c.presente).length ?? 0
            const ausentes  = ef.colaboradores?.filter(c => !c.presente).length ?? 0
            return (
              <div key={ef.id} className="rounded-xl border bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {new Date(ef.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'long',
                      })}
                    </p>
                    <p className="text-sm text-gray-500">Empreiteiro: {ef.empreiteiro_id}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <UserCheck className="h-4 w-4" />{presentes} presentes
                    </span>
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <UserX className="h-4 w-4" />{ausentes} ausentes
                    </span>
                  </div>
                </div>
                {ef.colaboradores && ef.colaboradores.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ef.colaboradores.map(c => (
                      <span
                        key={c.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          c.presente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {c.presente ? '✓' : '✗'} {c.colaborador_id.substring(0, 8)}…
                        {!c.presente && c.motivo_ausencia && ` (${c.motivo_ausencia})`}
                      </span>
                    ))}
                  </div>
                )}
                {ef.observacoes && (
                  <p className="mt-2 text-sm text-gray-500 italic">{ef.observacoes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal de Cadastro ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">Registrar Efetivo</h2>
              <button onClick={() => setShowModal(false)} aria-label="Fechar modal">
                <X className="h-5 w-5 text-gray-500 hover:text-gray-800" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Obra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Obra <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.obra_id}
                  onChange={e => setForm(f => ({ ...f, obra_id: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma obra...</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>

              {/* Empreiteiro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empreiteiro <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.empreiteiro_id}
                  onChange={e => setForm(f => ({ ...f, empreiteiro_id: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um empreiteiro...</option>
                  {empreiteiros.map(em => (
                    <option key={em.id} value={em.id}>
                      {em.razao_social}{em.nome_fantasia ? ` — ${em.nome_fantasia}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  rows={3}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Informações adicionais sobre o efetivo do dia..."
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Ações */}
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
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
